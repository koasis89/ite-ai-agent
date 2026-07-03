import React, { useCallback, useEffect, useState } from "react";

type WorkspaceAccessStatus = {
  rootPath: string;
  canRead: boolean;
  canWrite: boolean;
  checkedAt: string;
  errorMessage?: string;
  suggestions: string[];
};

export default function WorkspacePermissionBanner(): React.ReactElement | null {
  const [status, setStatus] = useState<WorkspaceAccessStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI?.checkWorkspaceAccess?.();
      if (result?.ok && result.data) {
        setStatus(result.data);
      } else {
        setStatus({
          rootPath: "(알 수 없음)",
          canRead: false,
          canWrite: false,
          checkedAt: new Date().toISOString(),
          errorMessage: result?.error || "권한 상태를 확인하지 못했습니다.",
          suggestions: ["앱을 재시작하고 다시 시도하세요."],
        });
      }
    } catch (err) {
      setStatus({
        rootPath: "(알 수 없음)",
        canRead: false,
        canWrite: false,
        checkedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : "권한 상태 확인 실패",
        suggestions: ["앱을 재시작하고 다시 시도하세요."],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  if (!status) return null;
  if (dismissed) return null;
  if (status.canRead && status.canWrite) return null;

  const badge = status.canRead ? "읽기: OK" : "읽기: FAIL";
  const writeBadge = status.canWrite ? "쓰기: OK" : "쓰기: FAIL";

  return (
    <div className="workspace-permission-banner" role="status" aria-live="polite">
      <div className="workspace-permission-banner-title">작업 루트 권한 문제 감지</div>
      <div className="workspace-permission-banner-line">루트: {status.rootPath}</div>
      <div className="workspace-permission-banner-line">
        {badge} · {writeBadge}
      </div>
      {status.errorMessage && (
        <div className="workspace-permission-banner-line">오류: {status.errorMessage}</div>
      )}
      {status.suggestions.length > 0 && (
        <ul className="workspace-permission-banner-list">
          {status.suggestions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <div className="workspace-permission-banner-actions">
        <button
          className="workspace-permission-banner-btn"
          onClick={() => void check()}
          disabled={loading}
        >
          {loading ? "점검 중..." : "다시 점검"}
        </button>
        <button
          className="workspace-permission-banner-btn secondary"
          onClick={() => setDismissed(true)}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
