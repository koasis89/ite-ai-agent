/**
 * EL-207: hooks 로그 비차단 Tailer
 *
 * 역할:
 *   - `.omx/logs/hooks-*.jsonl` 파일 목록을 감시하고 최신 파일을 추적한다.
 *   - fs.watch(폴링 금지)로 디렉터리 변경 이벤트를 수신한다.
 *   - 라인 버퍼 어셈블러로 불완전 청크를 조립하여 완전한 라인 단위로 콜백한다.
 *   - 날짜 로테이션 시 핫스위핑(이전 스트림 닫기 → 새 스트림 열기)을 수행한다.
 *
 * ADR-001 불변 규칙:
 *   #2: 폴링(setInterval/setTimeout 기반 감시) 금지 — fs.watch 이벤트 기반으로만
 *   #3: 직접 파일 쓰기 금지
 */

import * as fs from "fs";
import * as path from "path";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type LineCallback = (line: string) => void;

// ─── HookTailer 클래스 ────────────────────────────────────────────────────────

/**
 * `.omx/logs/` 디렉터리 내 `hooks-*.jsonl` 파일의 신규 라인을
 * 비차단으로 읽어 콜백에 전달하는 파일 Tailer.
 *
 * 사용 순서:
 *   1. `const tailer = new HookTailer()`
 *   2. `tailer.onLine((line) => dispatch(line))`
 *   3. `tailer.start("/path/to/.omx/logs")`
 *   4. `tailer.stop()` — 정리
 */
export class HookTailer {
  private logsDir = "";
  private watcher: fs.FSWatcher | null = null;
  private currentFilePath: string | null = null;
  private currentStream: fs.ReadStream | null = null;
  private lineBuffer = ""; // 불완전 청크 누적 버퍼
  private lineCallbacks: Set<LineCallback> = new Set();
  private stopped = false;

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * 로그 디렉터리 감시를 시작한다.
   * 이미 존재하는 최신 파일을 구독하고, 새 파일 생성 시 자동 전환한다.
   */
  start(logsDir: string): void {
    this.logsDir = logsDir;
    this.stopped = false;

    // 초기 최신 파일 구독
    const latest = this._findLatestFile();
    if (latest) {
      this._attachStream(latest);
    }

    // 디렉터리 변경 감시 (폴링 금지)
    try {
      this.watcher = fs.watch(logsDir, { persistent: false }, (event, filename) => {
        if (!filename) return;
        if (!filename.startsWith("hooks-") || !filename.endsWith(".jsonl")) return;
        this._onDirectoryChange(filename);
      });
    } catch (err) {
      // 디렉터리가 아직 존재하지 않으면 경고만 기록
      console.warn(`[HookTailer] 디렉터리 감시 실패: ${logsDir}`, err);
    }
  }

  /** 라인 수신 핸들러 등록 */
  onLine(cb: LineCallback): void {
    this.lineCallbacks.add(cb);
  }

  /** 라인 수신 핸들러 제거 */
  offLine(cb: LineCallback): void {
    this.lineCallbacks.delete(cb);
  }

  /** Tailer 정지 및 리소스 해제 */
  stop(): void {
    this.stopped = true;
    this._closeCurrentStream();
    if (this.watcher) {
      try { this.watcher.close(); } catch { /* 무시 */ }
      this.watcher = null;
    }
    this.lineBuffer = "";
  }

  // ─── 스트림 핫스위핑 ────────────────────────────────────────────────────────

  /**
   * 디렉터리 변경 이벤트를 처리한다.
   * 새 파일이 현재 추적 파일보다 최신이면 스트림을 교체한다.
   */
  private _onDirectoryChange(changedFilename: string): void {
    if (this.stopped) return;

    const changedPath = path.join(this.logsDir, changedFilename);

    // 현재 파일과 동일하면 새 내용은 스트림이 이미 수신 중 → skip
    if (changedPath === this.currentFilePath) return;

    // 새 파일이 더 최신인 경우 핫스위핑
    const latest = this._findLatestFile();
    if (latest && latest !== this.currentFilePath) {
      this._onRotation(latest);
    }
  }

  /**
   * 날짜 로테이션: 이전 스트림 닫고 새 파일 스트림 오픈.
   */
  private _onRotation(newFilePath: string): void {
    console.info(`[HookTailer] 로테이션 감지: ${path.basename(newFilePath)}`);
    this._closeCurrentStream();
    this.lineBuffer = ""; // 누적 버퍼 초기화
    this._attachStream(newFilePath);
  }

  // ─── 스트림 관리 ────────────────────────────────────────────────────────────

  /**
   * 지정 파일의 ReadStream을 열고 라인 버퍼 어셈블러를 연결한다.
   * `highWaterMark: 4096`으로 비차단 청크 읽기를 활성화한다.
   */
  private _attachStream(filePath: string): void {
    this.currentFilePath = filePath;

    const stream = fs.createReadStream(filePath, {
      encoding: "utf8",
      highWaterMark: 4096,
      autoClose: true,
    });
    this.currentStream = stream;

    stream.on("data", (chunk: string) => {
      this._processChunk(chunk);
    });

    stream.on("end", () => {
      // 스트림 EOF 후 남은 버퍼 처리
      if (this.lineBuffer.trim()) {
        this._emitLine(this.lineBuffer);
        this.lineBuffer = "";
      }
    });

    stream.on("error", (err) => {
      console.error(`[HookTailer] 스트림 에러: ${filePath}`, err);
    });
  }

  /**
   * 라인 버퍼 어셈블러:
   * 수신된 청크를 lineBuffer에 누적하며 \n 구분자로 완전한 라인을 추출한다.
   * 마지막 불완전 청크는 버퍼에 남겨 다음 청크와 조립된다.
   */
  private _processChunk(chunk: string): void {
    this.lineBuffer += chunk;
    const lines = this.lineBuffer.split("\n");

    // 마지막 요소는 불완전 청크 — 버퍼에 유지
    this.lineBuffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) this._emitLine(trimmed);
    }
  }

  /** 완전한 라인을 모든 핸들러로 전달 */
  private _emitLine(line: string): void {
    for (const cb of this.lineCallbacks) {
      try { cb(line); } catch { /* 핸들러 에러가 파이프라인 중단 방지 */ }
    }
  }

  private _closeCurrentStream(): void {
    if (this.currentStream) {
      try { this.currentStream.destroy(); } catch { /* 무시 */ }
      this.currentStream = null;
    }
    this.currentFilePath = null;
  }

  // ─── 최신 파일 탐색 ─────────────────────────────────────────────────────────

  /**
   * logsDir 내 `hooks-*.jsonl` 파일 중 mtime 기준 최신 파일 경로를 반환한다.
   * 파일 없으면 null 반환.
   */
  _findLatestFile(): string | null {
    try {
      const entries = fs.readdirSync(this.logsDir);
      const hookFiles = entries
        .filter((f) => f.startsWith("hooks-") && f.endsWith(".jsonl"))
        .map((f) => {
          const fullPath = path.join(this.logsDir, f);
          const stat = fs.statSync(fullPath);
          return { fullPath, mtime: stat.mtimeMs };
        })
        .sort((a, b) => b.mtime - a.mtime);

      return hookFiles[0]?.fullPath ?? null;
    } catch {
      return null;
    }
  }
}
