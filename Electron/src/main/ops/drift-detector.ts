/**
 * EL-225: 로그-카탈로그 정합성(Drift) 실시간 검증 모듈
 *
 * 아키텍처 규칙:
 *   - ADR-001: spawnSync 절대 금지 — 파일 읽기 전용 (비동기 fs)
 *   - `.omx/state/` 침범 없음 (읽기 전용)
 *   - Headless 인터페이스: CI 환경에서도 Electron 없이 실행 가능
 *
 * Drift 감지 로직:
 *   1. `.omx/logs/hooks-*.jsonl` 파일을 파싱해 도구 호출 소스 목록 추출
 *   2. `manifest.json` 플러그인 목록과 교차 검증
 *   3. 미등록 소스(섀도우 호출)를 Drift 항목으로 기록
 *   4. Drift Rate = (미등록 호출 수) / (전체 호출 수) * 100
 *   5. Drift Rate >= DRIFT_RATE_THRESHOLD(10%) 시 이벤트 방출
 */

import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { EventEmitter } from "node:events";

// ─── 상수 ────────────────────────────────────────────────────────────────────

/** Drift 위기 임계치 (%). 이 값 이상이면 경고 방출 */
export const DRIFT_RATE_THRESHOLD = 10;

// ─── 스키마 ──────────────────────────────────────────────────────────────────

/** `.omx/logs/hooks-*.jsonl` 각 라인 스키마 */
export const HookLogLineSchema = z.object({
  source: z.string(),
  context: z.string().optional(),
  tool: z.string().optional(),
  event: z.string().optional(),
  timestamp: z.string().optional(),
});
export type HookLogLine = z.infer<typeof HookLogLineSchema>;

/** `manifest.json` 플러그인 목록 스키마 */
export const ManifestSchema = z.object({
  plugins: z.array(
    z.object({
      name: z.string(),
      id: z.string().optional(),
      enabled: z.boolean().optional(),
    })
  ),
});
export type Manifest = z.infer<typeof ManifestSchema>;

/** 단일 Drift 항목 */
export const DriftItemSchema = z.object({
  source: z.string(),
  tool: z.string().optional(),
  logFile: z.string(),
  lineNumber: z.number(),
  timestamp: z.string().optional(),
});
export type DriftItem = z.infer<typeof DriftItemSchema>;

/** Drift 리포트 */
export const DriftReportSchema = z.object({
  totalCalls: z.number(),
  driftCount: z.number(),
  driftRate: z.number(),   // 0.0 ~ 100.0 퍼센트
  driftItems: z.array(DriftItemSchema),
  checkedAt: z.string(),
  isCritical: z.boolean(),
});
export type DriftReport = z.infer<typeof DriftReportSchema>;

// ─── 파일 읽기 헬퍼 ──────────────────────────────────────────────────────────

/** JSONL 파일을 읽어 유효한 HookLogLine 배열로 반환 */
async function parseHookLog(
  filePath: string
): Promise<Array<HookLogLine & { _lineNumber: number }>> {
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    return [];
  }

  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const result: Array<HookLogLine & { _lineNumber: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      const obj = JSON.parse(lines[i]!);
      const parsed = HookLogLineSchema.safeParse(obj);
      if (parsed.success) {
        result.push({ ...parsed.data, _lineNumber: i + 1 });
      }
    } catch {
      // 비 JSON 라인 — 무시 (ADR-001: 크래시 없이 fallback)
    }
  }
  return result;
}

/** manifest.json 파일을 읽어 플러그인 이름 집합 반환 */
async function loadManifestSources(manifestPath: string): Promise<Set<string>> {
  try {
    const content = await fs.readFile(manifestPath, "utf-8");
    const obj = JSON.parse(content);
    const parsed = ManifestSchema.safeParse(obj);
    if (!parsed.success) return new Set();
    return new Set(parsed.data.plugins.map((p) => p.name));
  } catch {
    return new Set();
  }
}

/** `.omx/logs/` 디렉터리에서 hooks-*.jsonl 파일 목록 반환 */
async function findHookLogFiles(logsDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(logsDir);
    return entries
      .filter((e) => e.startsWith("hooks-") && e.endsWith(".jsonl"))
      .map((e) => path.join(logsDir, e));
  } catch {
    return [];
  }
}

// ─── DriftDetector 클래스 ────────────────────────────────────────────────────

/**
 * Drift 감지기.
 * `detect()` 메서드로 단일 검사를 수행하거나,
 * `startPolling(intervalMs)` 으로 실시간 폴링을 시작할 수 있다.
 *
 * @example
 * ```ts
 * const detector = new DriftDetector("/home/user/.omx");
 * detector.on("drift_critical", (report) => broadcastDriftAlert(report));
 * await detector.detect();
 * ```
 */
export class DriftDetector extends EventEmitter {
  private readonly _omxRoot: string;
  private _pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(omxRoot: string) {
    super();
    this._omxRoot = omxRoot;
  }

  get omxRoot(): string {
    return this._omxRoot;
  }

  // ── 단일 검사 ──────────────────────────────────────────────────────────────

  /**
   * 로그-매니페스트 교차 검증을 1회 수행하고 DriftReport를 반환한다.
   * CI / Headless 환경에서도 Electron 없이 호출 가능.
   */
  async detect(): Promise<DriftReport> {
    const logsDir = path.join(this._omxRoot, "logs");
    const manifestPath = path.join(this._omxRoot, "manifest.json");

    const [logFiles, registeredSources] = await Promise.all([
      findHookLogFiles(logsDir),
      loadManifestSources(manifestPath),
    ]);

    const driftItems: DriftItem[] = [];
    let totalCalls = 0;

    for (const logFile of logFiles) {
      const lines = await parseHookLog(logFile);
      totalCalls += lines.length;

      for (const line of lines) {
        if (!registeredSources.has(line.source)) {
          driftItems.push({
            source: line.source,
            tool: line.tool,
            logFile: path.basename(logFile),
            lineNumber: line._lineNumber,
            timestamp: line.timestamp,
          });
        }
      }
    }

    const driftRate = totalCalls > 0 ? (driftItems.length / totalCalls) * 100 : 0;
    const isCritical = driftRate >= DRIFT_RATE_THRESHOLD;

    const report: DriftReport = {
      totalCalls,
      driftCount: driftItems.length,
      driftRate: Math.round(driftRate * 100) / 100,
      driftItems,
      checkedAt: new Date().toISOString(),
      isCritical,
    };

    if (isCritical) {
      this.emit("drift_critical", report);
    }

    this.emit("drift_checked", report);
    return report;
  }

  // ── 폴링 제어 ──────────────────────────────────────────────────────────────

  /**
   * 지정 주기마다 `detect()`를 반복 실행한다.
   * 이미 실행 중이면 기존 타이머를 교체한다.
   */
  startPolling(intervalMs: number): void {
    this.stopPolling();
    this._pollTimer = setInterval(() => {
      this.detect().catch((err) => {
        console.error("[DriftDetector] 폴링 중 오류:", err);
      });
    }, intervalMs);
  }

  stopPolling(): void {
    if (this._pollTimer !== null) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  isPolling(): boolean {
    return this._pollTimer !== null;
  }
}

// ─── 싱글턴 ──────────────────────────────────────────────────────────────────

let _instance: DriftDetector | null = null;

export function getDriftDetector(omxRoot?: string): DriftDetector {
  if (!_instance) {
    if (!omxRoot) throw new Error("[DriftDetector] 초기화 시 omxRoot 경로가 필요합니다.");
    _instance = new DriftDetector(omxRoot);
  }
  return _instance;
}

export function _resetDriftDetectorForTest(): void {
  if (_instance) _instance.stopPolling();
  _instance = null;
}
