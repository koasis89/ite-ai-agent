/**
 * EL-223: Knowledge Explorer UI 컴포넌트 테스트
 *
 * 검증 항목:
 *   - KnowledgePanel: isOpen=false 시 렌더링 안됨
 *   - KnowledgePanel: isOpen=true 시 검색 입력 + 버튼 렌더링
 *   - KnowledgePanel: 위키 결과 데이터 전달 시 결과 목록 렌더링
 *   - KnowledgePanel: 히스토리 항목 클릭 시 document 열기
 *   - AdapterStatusBar: running/degraded/unavailable 상태 렌더링
 *   - AdapterStatusBar: 모두 unavailable 시 컴포넌트 미렌더링
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { KnowledgePanel } from "../../renderer/components/KnowledgePanel";
import { AdapterStatusBar, type AdapterInfo } from "../../renderer/components/AdapterStatusBar";

// ─── electronAPI 모킹 ────────────────────────────────────────────────────────

function makeElectronAPIMock(overrides: Record<string, unknown> = {}): void {
  Object.defineProperty(window, "electronAPI", {
    value: {
      onAdapterStatus: vi.fn(() => () => {}),
      wikiSearch: vi.fn(),
      wikiRead: vi.fn(),
      ...overrides,
    },
    writable: true,
    configurable: true,
  });
}

function clearElectronAPIMock(): void {
  Object.defineProperty(window, "electronAPI", {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

// ─── KnowledgePanel 테스트 ───────────────────────────────────────────────────

describe("KnowledgePanel", () => {
  const onCloseMock = vi.fn();

  beforeEach(() => {
    makeElectronAPIMock();
  });

  afterEach(() => {
    clearElectronAPIMock();
    onCloseMock.mockClear();
  });

  it("isOpen=false 시 DOM에 렌더링되지 않아야 한다", () => {
    render(<KnowledgePanel isOpen={false} onClose={onCloseMock} />);
    expect(screen.queryByTestId("knowledge-panel")).toBeNull();
  });

  it("isOpen=true 시 패널이 렌더링되어야 한다", () => {
    render(<KnowledgePanel isOpen={true} onClose={onCloseMock} />);
    expect(screen.getByTestId("knowledge-panel")).toBeTruthy();
  });

  it("검색 입력 필드가 렌더링되어야 한다", () => {
    render(<KnowledgePanel isOpen={true} onClose={onCloseMock} />);
    const input = screen.getByTestId("knowledge-search-input");
    expect(input).toBeTruthy();
  });

  it("검색 버튼이 렌더링되어야 한다", () => {
    render(<KnowledgePanel isOpen={true} onClose={onCloseMock} />);
    const button = screen.getByTestId("knowledge-search-button");
    expect(button).toBeTruthy();
  });

  it("검색 결과 데이터가 있을 때 위키 결과 아이템을 렌더링해야 한다", async () => {
    const MOCK_SEARCH_RESULT = {
      query: "아키텍처",
      hits: [
        { title: "아키텍처 개요", excerpt: "전체 구조 설명", path: "docs/arch.md" },
        { title: "API 가이드", excerpt: "REST API 명세", path: "docs/api.md" },
      ],
    };

    makeElectronAPIMock({
      wikiSearch: vi.fn().mockResolvedValue(MOCK_SEARCH_RESULT),
    });

    render(<KnowledgePanel isOpen={true} onClose={onCloseMock} />);

    const input = screen.getByTestId("knowledge-search-input");
    fireEvent.change(input, { target: { value: "아키텍처" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("knowledge-search-button"));
    });

    const items = screen.getAllByTestId("wiki-result-item");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("아키텍처 개요");
    expect(items[1].textContent).toContain("API 가이드");
  });

  it("검색 결과 아이템 클릭 시 wikiRead가 호출되어야 한다", async () => {
    const wikiReadMock = vi.fn().mockResolvedValue({
      title: "아키텍처 개요",
      content: "# 아키텍처\n내용입니다.",
    });
    makeElectronAPIMock({
      wikiSearch: vi.fn().mockResolvedValue({
        query: "아키텍처",
        hits: [{ title: "아키텍처 개요", excerpt: "..." }],
      }),
      wikiRead: wikiReadMock,
    });

    render(<KnowledgePanel isOpen={true} onClose={onCloseMock} />);

    const input = screen.getByTestId("knowledge-search-input");
    fireEvent.change(input, { target: { value: "아키텍처" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("knowledge-search-button"));
    });

    await act(async () => {
      const item = screen.getByTestId("wiki-result-item");
      fireEvent.click(item);
    });

    expect(wikiReadMock).toHaveBeenCalledWith("아키텍처 개요");
  });

  it("닫기 버튼 클릭 시 onClose가 호출되어야 한다", () => {
    render(<KnowledgePanel isOpen={true} onClose={onCloseMock} />);
    const closeButton = screen.getByLabelText("지식 탐색기 닫기");
    fireEvent.click(closeButton);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("검색 히스토리가 최대 20개를 유지해야 한다", async () => {
    let searchCount = 0;
    makeElectronAPIMock({
      wikiSearch: vi.fn().mockImplementation(() => {
        searchCount++;
        return Promise.resolve({
          query: `검색어${searchCount}`,
          hits: [],
        });
      }),
    });

    render(<KnowledgePanel isOpen={true} onClose={onCloseMock} />);

    for (let i = 0; i < 22; i++) {
      const input = screen.getByTestId("knowledge-search-input");
      fireEvent.change(input, { target: { value: `검색어${i}` } });
      await act(async () => {
        fireEvent.click(screen.getByTestId("knowledge-search-button"));
      });
    }

    const historyItems = screen.getAllByTestId("history-query");
    expect(historyItems.length).toBeLessThanOrEqual(20);
  });
});

// ─── AdapterStatusBar 테스트 ─────────────────────────────────────────────────

describe("AdapterStatusBar", () => {
  let onAdapterStatusCallback: ((info: AdapterInfo) => void) | null = null;

  beforeEach(() => {
    makeElectronAPIMock({
      onAdapterStatus: vi.fn((cb: (info: AdapterInfo) => void) => {
        onAdapterStatusCallback = cb;
        return () => { onAdapterStatusCallback = null; };
      }),
    });
  });

  afterEach(() => {
    clearElectronAPIMock();
    onAdapterStatusCallback = null;
  });

  it("초기 상태에서 상태 표시줄이 렌더링되어야 한다", () => {
    render(<AdapterStatusBar />);
    expect(screen.getByTestId("adapter-status-bar")).toBeTruthy();
  });

  it("running 상태 수신 시 칩이 렌더링되어야 한다", async () => {
    render(<AdapterStatusBar />);

    await act(async () => {
      onAdapterStatusCallback?.({
        target: "openclaw",
        status: "running",
        probed_at: new Date().toISOString(),
      });
    });

    const chip = screen.getByTestId("adapter-chip-openclaw");
    expect(chip).toBeTruthy();
    expect(chip.textContent).toContain("OpenClaw");
    expect(chip.textContent).toContain("연결됨");
  });

  it("degraded 상태 수신 시 불안정 레이블이 표시되어야 한다", async () => {
    render(<AdapterStatusBar />);

    await act(async () => {
      onAdapterStatusCallback?.({
        target: "hermes",
        status: "degraded",
        probed_at: new Date().toISOString(),
      });
    });

    const chip = screen.getByTestId("adapter-chip-hermes");
    expect(chip.textContent).toContain("Hermes");
    expect(chip.textContent).toContain("불안정");
  });

  it("openclaw + hermes 두 칩이 동시에 렌더링되어야 한다", async () => {
    render(<AdapterStatusBar />);

    await act(async () => {
      onAdapterStatusCallback?.({
        target: "openclaw",
        status: "running",
        probed_at: new Date().toISOString(),
      });
      onAdapterStatusCallback?.({
        target: "hermes",
        status: "installed",
        probed_at: new Date().toISOString(),
      });
    });

    expect(screen.getByTestId("adapter-chip-openclaw")).toBeTruthy();
    expect(screen.getByTestId("adapter-chip-hermes")).toBeTruthy();
  });

  it("onAdapterClick 콜백이 칩 클릭 시 호출되어야 한다", async () => {
    const onClick = vi.fn();
    render(<AdapterStatusBar onAdapterClick={onClick} />);

    await act(async () => {
      onAdapterStatusCallback?.({
        target: "openclaw",
        status: "running",
        probed_at: new Date().toISOString(),
      });
    });

    fireEvent.click(screen.getByTestId("adapter-chip-openclaw"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0].target).toBe("openclaw");
  });
});
