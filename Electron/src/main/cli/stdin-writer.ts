/**
 * EL-214: CLI stdin 쓰기 파이프라인 — 백프레셔(Backpressure) 안전 제어
 *
 * 일시 중단 상태로 대기 중인 CLI 자식 프로세스에 텍스트 컨텍스트를
 * 유실 없이 안전하게 주입하는 stdin 래퍼 모듈.
 *
 * 핵심 보장:
 *   1. 백프레셔 가드 — write() falsy 반환 시 drain 이벤트 대기 후 재개
 *   2. 개행 규격 — 모든 데이터 끝에 \n 엔드마커 강제 주입
 *   3. 종료 방어 가드 — child.killed 선검증으로 크래시 원천 차단
 *
 * ADR-001 불변 규칙 #2: spawn 비동기만 허용. spawnSync 절대 금지.
 */

import type { ChildProcessWithoutNullStreams } from "child_process";

// ─── 공개 인터페이스 ──────────────────────────────────────────────────────────

/**
 * writeToStdin 옵션
 *
 * @param child    대상 자식 프로세스 (stdin이 열려 있어야 함)
 * @param data     주입할 텍스트 컨텍스트
 * @param encoding 인코딩 (기본: "utf8")
 */
export interface WriteToStdinOptions {
  child: ChildProcessWithoutNullStreams;
  data: string;
  encoding?: BufferEncoding;
}

// ─── 핵심 구현 ────────────────────────────────────────────────────────────────

/**
 * CLI 자식 프로세스의 stdin에 데이터를 안전하게 주입한다.
 *
 * 처리 흐름:
 *   1. child.killed / child.stdin null 체크 → 종료된 프로세스 크래시 방지
 *   2. 데이터 끝에 \n 개행 자동 추가 (readline 인터페이스 대기 돌파)
 *   3. write() 호출 후 반환값이 false이면 drain 이벤트 수신까지 대기
 *      (Node.js 스트림 백프레셔 준수)
 *
 * @returns 쓰기 완료 Promise — drain 포함 완전 플러시 후 resolve
 * @throws  프로세스가 이미 종료된 경우 Error("Process is already killed") throw
 */
export async function writeToStdin(opts: WriteToStdinOptions): Promise<void> {
  const { child, data, encoding = "utf8" } = opts;

  // ─── 방어 가드 ──────────────────────────────────────────────────────────────

  if (child.killed || !child.stdin) {
    throw new Error("[stdin-writer] Process is already killed or stdin is closed");
  }

  // ─── 개행 엔드마커 래핑 ─────────────────────────────────────────────────────

  // CLI readline 인터페이스가 '\n' 수신 시에만 대기를 돌파함.
  // 데이터 자체에 이미 \n이 있어도 안전하게 추가 (readline은 빈 줄로 처리).
  const payload = data.endsWith("\n") ? data : `${data}\n`;

  // ─── 백프레셔 안전 쓰기 ──────────────────────────────────────────────────────

  const canContinue = child.stdin.write(payload, encoding);

  if (!canContinue) {
    // 내부 버퍼가 한계에 도달 — drain 이벤트 대기 후 재개
    await waitForDrain(child);
  }
}

/**
 * stdin의 drain 이벤트를 1회 수신할 때까지 Promise로 대기한다.
 *
 * @param child 대상 자식 프로세스
 */
function waitForDrain(child: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // 프로세스가 drain 전에 종료된 경우 안전 처리
    const onClose = () => {
      cleanup();
      reject(new Error("[stdin-writer] Process closed before drain"));
    };

    const onDrain = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      child.stdin!.removeListener("drain", onDrain);
      child.removeListener("close", onClose);
    };

    child.stdin!.once("drain", onDrain);
    child.once("close", onClose);
  });
}

// ─── 고수준 편의 함수 ─────────────────────────────────────────────────────────

/**
 * 여러 줄 데이터를 순차 안전 주입한다.
 *
 * 각 항목이 백프레셔를 완전히 해소한 뒤 다음 항목을 주입하므로
 * 고속 버스트 쓰기 시나리오에서도 데이터 유실이 없음.
 *
 * @param child  대상 자식 프로세스
 * @param chunks 주입할 텍스트 배열
 */
export async function writeBurstToStdin(
  child: ChildProcessWithoutNullStreams,
  chunks: string[],
): Promise<void> {
  for (const chunk of chunks) {
    await writeToStdin({ child, data: chunk });
  }
}
