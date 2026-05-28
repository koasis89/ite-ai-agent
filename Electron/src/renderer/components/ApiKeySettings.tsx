/**
 * ApiKeySettings — Gemini API 키 설정 패널
 *
 * Gemini 모델 선택 시 API 키가 미설정된 경우 표시되는 인라인 설정 폼.
 * safeStorage(OS 키체인)에 암호화 저장한다.
 */

import React, { useState } from "react";

// ─── IPC 타입 선언 ────────────────────────────────────────────────────────────

declare global {
  interface Window {
    electronAPI: {
      geminiKey?: {
        save: (key: string) => Promise<{ ok: boolean }>;
        clear: () => Promise<{ ok: boolean }>;
        getStatus: () => Promise<{ available: boolean }>;
      };
    };
  }
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

interface ApiKeySettingsProps {
  /** 키 저장 성공 시 상위 컴포넌트에 알림 */
  onKeySet?: () => void;
}

export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({ onKeySet }) => {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setErrorMsg("API 키를 입력하세요.");
      setStatus("error");
      return;
    }
    if (!trimmed.startsWith("AIzaSy") || trimmed.length < 39) {
      setErrorMsg("키 형식이 올바르지 않습니다 (AIzaSy... 39자 이상)");
      setStatus("error");
      return;
    }

    setStatus("saving");
    try {
      const result = await window.electronAPI?.geminiKey?.save(trimmed);
      if (result?.ok) {
        setStatus("saved");
        setApiKey(""); // 원문 즉시 지우기
        onKeySet?.();
      } else {
        setErrorMsg("저장 실패: IPC 오류");
        setStatus("error");
      }
    } catch (e) {
      setErrorMsg(`저장 실패: ${String(e)}`);
      setStatus("error");
    }
  };

  const handleClear = async () => {
    try {
      await window.electronAPI?.geminiKey?.clear();
      setStatus("idle");
      setApiKey("");
    } catch {
      // 무시
    }
  };

  return (
    <div style={{
      background: "#fffbeb",
      border: "1px solid #fcd34d",
      borderRadius: 8,
      padding: "12px 16px",
      margin: "8px 0",
    }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: "#92400e", marginBottom: 8 }}>
        ⚠️ Gemini API 키 필요
      </div>
      <div style={{ fontSize: 12, color: "#78350f", marginBottom: 10 }}>
        Gemini 모델을 사용하려면 Google AI Studio에서 발급한 API 키가 필요합니다.
        키는 OS 키체인에 안전하게 암호화 저장됩니다.
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="AIzaSy..."
          autoComplete="off"
          style={{
            flex: 1,
            padding: "6px 10px",
            fontSize: 13,
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontFamily: "monospace",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSave();
          }}
        />
        <button
          onClick={() => void handleSave()}
          disabled={status === "saving"}
          style={{
            padding: "6px 14px",
            fontSize: 13,
            background: "#059669",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: status === "saving" ? "not-allowed" : "pointer",
            opacity: status === "saving" ? 0.6 : 1,
          }}
        >
          {status === "saving" ? "저장 중..." : "저장"}
        </button>
        <button
          onClick={() => void handleClear()}
          style={{
            padding: "6px 10px",
            fontSize: 13,
            background: "#e5e7eb",
            color: "#374151",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          삭제
        </button>
      </div>

      {status === "error" && (
        <div style={{ marginTop: 6, fontSize: 12, color: "#dc2626" }}>{errorMsg}</div>
      )}
      {status === "saved" && (
        <div style={{ marginTop: 6, fontSize: 12, color: "#059669" }}>
          ✓ API 키가 저장되었습니다.
        </div>
      )}
    </div>
  );
};
