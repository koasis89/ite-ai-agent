/**
 * EL-217: .omx/state/ 파일 워처 및 진실의 경계(Truth Boundary) 모듈
 *
 * 에이전트 수명주기의 절대적 원본인 `.omx/state/` 디렉터리를 실시간 감시하고,
 * 앱 내부에 상태를 이중 캐싱하지 않으며 파일 스냅샷만을 반환한다.
 *
 * 감시 대상 파일:
 *   - team-state.json          — 메인 팀 수명주기 상태
 *   - *-state.json             — 모드별 상태 (ralph, ultrawork 등)
 *   - skill-active-state.json  — 현재 활성 스킬 상태
 *
 * 구현 노트:
 *   - chokidar 미설치 환경 대응: Node.js 내장 fs.watch 사용 (HookTailer 동일 패턴)
 *   - chokidar 설치 시 watcher 구현부만 교체 가능 (인터페이스 변경 없음)
 *
 * ADR-001 불변 규칙:
 *   #2: 폴링(setInterval/setTimeout 기반 감시) 금지 — fs.watch 이벤트 기반으로만
 *   #3: 직접 파일 쓰기 금지
 */

import * as fs from "fs";
import * as path from "path";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

/** 상태 파일 변경 이벤트 페이로드 */
export interface StateChangeEvent {
  /** 변경된 파일명 (basename) */
  filename: string;
  /** 파싱된 JSON 객체. 파싱 실패 또는 파일 삭제 시 null */
  snapshot: Record<string, unknown> | null;
}

/** 상태 변경 콜백 */
export type StateChangeCallback = (event: StateChangeEvent) => void;

/** 디바운스 간격 (ms) — I/O 버스트 중복 방지 */
const DEBOUNCE_MS = 150;

/** 감시 대상 파일명 패턴 */
const STATE_FILE_PATTERN = /^(team-state|skill-active-state|.*-state)\.json$/;

// ─── StateWatcher 클래스 ──────────────────────────────────────────────────────

/**
 * `.omx/state/` 디렉터리의 핵심 상태 파일을 감시하는 워처.
 *
 * 사용 순서:
 *   1. `const watcher = new StateWatcher()`
 *   2. `watcher.onChange((evt) => handleStateChange(evt))`
 *   3. `watcher.start("/path/to/.omx/state")`
 *   4. `watcher.stop()` — 정리
 */
export class StateWatcher {
  private stateDir = "";
  private dirWatcher: fs.FSWatcher | null = null;
  private fileWatchers = new Map<string, fs.FSWatcher>();
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private changeCallbacks: Set<StateChangeCallback> = new Set();
  private stopped = false;

  // ─── 공개 API ─────────────────────────────────────────────────────────────

  /**
   * 상태 디렉터리 감시를 시작한다.
   * 이미 존재하는 파일을 모두 구독하고, 신규 파일 생성 시 자동 추가한다.
   */
  start(stateDir: string): void {
    this.stateDir = stateDir;
    this.stopped = false;

    // 디렉터리가 없으면 조용히 대기
    if (!fs.existsSync(stateDir)) {
      this._watchForDirCreation(stateDir);
      return;
    }

    this._attachExistingFiles();
    this._watchDirectory();
  }

  /** 상태 변경 콜백 등록 */
  onChange(cb: StateChangeCallback): void {
    this.changeCallbacks.add(cb);
  }

  /** 상태 변경 콜백 제거 */
  offChange(cb: StateChangeCallback): void {
    this.changeCallbacks.delete(cb);
  }

  /**
   * 감시를 중지하고 모든 리소스를 정리한다.
   */
  stop(): void {
    this.stopped = true;

    // 디바운스 타이머 전체 취소
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // 디렉터리 워처 닫기
    this.dirWatcher?.close();
    this.dirWatcher = null;

    // 개별 파일 워처 닫기
    for (const w of this.fileWatchers.values()) {
      w.close();
    }
    this.fileWatchers.clear();
  }

  /**
   * 현재 상태 디렉터리의 모든 대상 파일을 즉시 읽어 맵으로 반환한다.
   * UI 마운트 시 초기 Rehydration에 사용.
   *
   * @returns Map<filename, parsed JSON> — 파싱 실패 시 해당 파일은 제외
   */
  getCurrentState(): Map<string, Record<string, unknown>> {
    const result = new Map<string, Record<string, unknown>>();

    if (!this.stateDir || !fs.existsSync(this.stateDir)) {
      return result;
    }

    let entries: string[];
    try {
      entries = fs.readdirSync(this.stateDir);
    } catch {
      return result;
    }

    for (const filename of entries) {
      if (!STATE_FILE_PATTERN.test(filename)) continue;
      const parsed = this._readStateFile(filename);
      if (parsed !== null) {
        result.set(filename, parsed);
      }
    }

    return result;
  }

  // ─── 내부 구현 ────────────────────────────────────────────────────────────

  /**
   * 디렉터리가 아직 없을 때 — 부모 디렉터리를 감시하다가
   * 상태 디렉터리가 생성되면 자동으로 start() 재진입한다.
   */
  private _watchForDirCreation(stateDir: string): void {
    const parentDir = path.dirname(stateDir);
    const targetName = path.basename(stateDir);

    if (!fs.existsSync(parentDir)) return;

    try {
      const parentWatcher = fs.watch(parentDir, { persistent: false }, (event, filename) => {
        if (filename === targetName && fs.existsSync(stateDir)) {
          parentWatcher.close();
          if (!this.stopped) {
            this._attachExistingFiles();
            this._watchDirectory();
          }
        }
      });
    } catch {
      // 조용히 무시
    }
  }

  /** 기존 파일 목록을 읽어 각각 개별 워처를 등록한다 */
  private _attachExistingFiles(): void {
    try {
      const entries = fs.readdirSync(this.stateDir);
      for (const filename of entries) {
        if (STATE_FILE_PATTERN.test(filename)) {
          this._attachFileWatcher(filename);
        }
      }
    } catch {
      // 조용히 무시
    }
  }

  /** 디렉터리 전체 감시 — 신규 파일 생성 감지 */
  private _watchDirectory(): void {
    try {
      this.dirWatcher = fs.watch(
        this.stateDir,
        { persistent: false },
        (event, filename) => {
          if (!filename || !STATE_FILE_PATTERN.test(filename)) return;
          // 신규 파일 생성 시 개별 워처 추가
          if (event === "rename" && !this.fileWatchers.has(filename)) {
            const fullPath = path.join(this.stateDir, filename);
            if (fs.existsSync(fullPath)) {
              this._attachFileWatcher(filename);
            }
          }
          // 변경 이벤트는 개별 파일 워처가 처리하지만 디렉터리 이벤트도 처리
          this._scheduleRead(filename);
        },
      );
    } catch (err) {
      console.warn(`[StateWatcher] 디렉터리 감시 실패: ${this.stateDir}`, err);
    }
  }

  /** 개별 파일에 fs.watch를 붙인다 */
  private _attachFileWatcher(filename: string): void {
    if (this.fileWatchers.has(filename)) return;

    const fullPath = path.join(this.stateDir, filename);
    try {
      const watcher = fs.watch(fullPath, { persistent: false }, () => {
        this._scheduleRead(filename);
      });
      this.fileWatchers.set(filename, watcher);
    } catch {
      // 파일이 이미 삭제된 경우 등 무시
    }
  }

  /**
   * 디바운스 스케줄러 — DEBOUNCE_MS 이내 중복 이벤트는 단일 읽기로 수렴한다.
   *
   * OS I/O 버스트(파일 저장 시 여러 change 이벤트 발생)를 방지하기 위해
   * 타이머를 재설정하는 방식으로 마지막 이벤트 기준 DEBOUNCE_MS 후 1회만 읽음.
   */
  private _scheduleRead(filename: string): void {
    const existing = this.debounceTimers.get(filename);
    if (existing !== undefined) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filename);
      if (!this.stopped) {
        this._emitChange(filename);
      }
    }, DEBOUNCE_MS);

    this.debounceTimers.set(filename, timer);
  }

  /** 파일을 읽어 변경 이벤트를 콜백으로 발행한다 */
  private _emitChange(filename: string): void {
    const snapshot = this._readStateFile(filename);
    const event: StateChangeEvent = { filename, snapshot };
    for (const cb of this.changeCallbacks) {
      try {
        cb(event);
      } catch (err) {
        console.error(`[StateWatcher] 콜백 오류 (${filename}):`, err);
      }
    }
  }

  /**
   * 상태 파일을 읽어 JSON으로 파싱한다.
   * 파일 없음 또는 파싱 실패 시 null 반환.
   */
  private _readStateFile(filename: string): Record<string, unknown> | null {
    const fullPath = path.join(this.stateDir, filename);
    try {
      const raw = fs.readFileSync(fullPath, "utf-8");
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

// ─── 싱글턴 ───────────────────────────────────────────────────────────────────

let _instance: StateWatcher | null = null;

/** 전역 StateWatcher 싱글턴을 반환한다 */
export function getStateWatcher(): StateWatcher {
  if (!_instance) {
    _instance = new StateWatcher();
  }
  return _instance;
}

/** 테스트용 내부 싱글턴 초기화 */
export function _resetStateWatcherForTest(): void {
  _instance?.stop();
  _instance = null;
}
