import React, { useEffect, useMemo, useState } from "react";

type SkillItem = {
  skillId: string;
  actionId: string;
  name: string;
  category: "execution" | "planning" | "shortcut" | "utility";
  status: "active" | "alias" | "merged" | "deprecated" | "internal";
  canonical?: string;
  executable: boolean;
  warnings: string[];
  supported: boolean;
};

type LoadState = "idle" | "loading" | "done" | "error";

export default function SkillCatalogPanel(): React.ReactElement {
  const [items, setItems] = useState<SkillItem[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string>("");
  const [showDeprecated, setShowDeprecated] = useState(false);
  const [runResultBySkill, setRunResultBySkill] = useState<Record<string, string>>({});
  const [runningSkillId, setRunningSkillId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setState("loading");
      setError("");

      try {
        const result = await window.electronAPI?.listSkillContracts?.();
        if (!mounted) return;

        if (!result?.ok || !Array.isArray(result.data)) {
          setState("error");
          setError(result?.error || "스킬 목록을 불러오지 못했습니다.");
          return;
        }

        const shortcutUtility = result.data.filter(
          (item) => item.category === "shortcut" || item.category === "utility",
        );

        const evaluated = await Promise.all(
          shortcutUtility.map(async (item) => {
            const policyResult = await window.electronAPI?.getSkillExecutionPolicy?.({
              skillName: item.skillId,
              allowDeprecated: showDeprecated,
              allowInternal: false,
            });

            if (policyResult?.ok && policyResult.data) {
              return {
                ...item,
                name: item.name || item.skillId,
                executable: policyResult.data.executable,
                warnings: policyResult.data.warnings,
              } as SkillItem;
            }

            return {
              ...item,
              name: item.name || item.skillId,
              executable: false,
              warnings: ["policy_check_failed"],
            } as SkillItem;
          }),
        );

        const visible = evaluated
          .filter((item) => item.status !== "internal")
          .filter((item) => showDeprecated || item.status !== "deprecated");

        setItems(visible);
        setState("done");
      } catch (err) {
        if (!mounted) return;
        setState("error");
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [showDeprecated]);

  const handleRunSkill = async (item: SkillItem) => {
    if (!item.supported || !item.actionId || !item.executable) {
      return;
    }

    if (!(item.category === "execution" || item.category === "planning")) {
      setRunResultBySkill((prev) => ({
        ...prev,
        [item.skillId]: "실행 경로는 execution/planning 스킬에만 연결되어 있습니다.",
      }));
      return;
    }

    setRunningSkillId(item.skillId);
    setRunResultBySkill((prev) => ({
      ...prev,
      [item.skillId]: "실행 중...",
    }));

    try {
      const result = await window.electronAPI?.invokeSkill?.({
        actionId: item.actionId,
        payload: {
          prompt: `[UI] ${item.skillId} 실행 테스트`,
          metadata: {
            source: "skill-catalog-panel",
          },
        },
        context: {
          actor: "renderer-skill-panel",
        },
        policy: {
          allowDeprecated: showDeprecated,
          allowInternal: false,
        },
      });

      if (result?.ok) {
        setRunResultBySkill((prev) => ({
          ...prev,
          [item.skillId]: "실행 요청 성공",
        }));
      } else {
        setRunResultBySkill((prev) => ({
          ...prev,
          [item.skillId]: `실패: ${result?.error?.message || "unknown"}`,
        }));
      }
    } catch (err) {
      setRunResultBySkill((prev) => ({
        ...prev,
        [item.skillId]: `오류: ${err instanceof Error ? err.message : "unknown"}`,
      }));
    } finally {
      setRunningSkillId(null);
    }
  };

  const enabledCount = useMemo(
    () => items.filter((item) => item.status !== "deprecated" && item.status !== "internal").length,
    [items],
  );

  const deprecatedCount = useMemo(
    () => items.filter((item) => item.status === "deprecated").length,
    [items],
  );

  const aliasOrMergedCount = useMemo(
    () =>
      items.filter((item) => item.status === "alias" || item.status === "merged")
        .length,
    [items],
  );

  return (
    <aside className="skill-catalog-panel" aria-label="스킬 카탈로그">
      <div className="skill-catalog-header">
        <div className="skill-catalog-title">스킬 목록</div>
        <div className="skill-catalog-meta">
          {enabledCount}/{items.length} enabled
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <button
          onClick={() => setShowDeprecated((prev) => !prev)}
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            background: "#ffffff",
            color: "#334155",
            fontSize: 11,
            padding: "3px 8px",
            cursor: "pointer",
          }}
          title="deprecated 스킬 표시 토글"
        >
          고급: deprecated {showDeprecated ? "표시중" : "숨김"}
        </button>
        <span style={{ fontSize: 11, color: "#64748b" }}>
          alias/merged {aliasOrMergedCount}개
          {showDeprecated ? ` · deprecated ${deprecatedCount}개` : ""}
        </span>
      </div>

      {state === "loading" && (
        <div className="skill-catalog-empty">불러오는 중...</div>
      )}

      {state === "error" && (
        <div className="skill-catalog-empty">오류: {error}</div>
      )}

      {state === "done" && items.length === 0 && (
        <div className="skill-catalog-empty">표시할 스킬이 없습니다.</div>
      )}

      {state === "done" && items.length > 0 && (
        <ul className="skill-catalog-list">
          {items.map((item) => (
            <li key={item.skillId || item.name} className="skill-catalog-item">
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div className="skill-catalog-item-name">{item.name || item.skillId}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>
                  id: {item.skillId}
                  {item.actionId ? ` | action: ${item.actionId}` : ""}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11 }}>
                  <span style={{ color: "#475569" }}>[{item.category}]</span>
                  {item.status === "alias" || item.status === "merged" ? (
                    <span style={{ color: "#1d4ed8" }}>
                      {`${item.status} -> ${item.canonical || "(canonical 미정)"}`}
                    </span>
                  ) : (
                    <span style={{ color: "#475569" }}>{item.status}</span>
                  )}
                </div>
                {item.status === "deprecated" && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#92400e",
                      background: "#ffedd5",
                      border: "1px solid #fed7aa",
                      borderRadius: 4,
                      padding: "2px 6px",
                      width: "fit-content",
                    }}
                    title="deprecated 스킬은 기본 차단이며 고급 옵션에서만 노출됩니다."
                  >
                    경고: deprecated (기본 차단)
                  </div>
                )}
                {runResultBySkill[item.skillId] && (
                  <div style={{ fontSize: 10, color: "#0369a1" }}>
                    {runResultBySkill[item.skillId]}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                <span
                  className={
                    item.executable
                      ? "skill-catalog-badge enabled"
                      : "skill-catalog-badge disabled"
                  }
                >
                  {item.executable ? "executable" : "blocked"}
                </span>
                {!item.executable && item.warnings.length > 0 && (
                  <span style={{ fontSize: 10, color: "#b45309" }}>
                    {item.warnings.join(", ")}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void handleRunSkill(item);
                  }}
                  disabled={
                    runningSkillId === item.skillId ||
                    !item.supported ||
                    !item.executable ||
                    !(item.category === "execution" || item.category === "planning")
                  }
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    background: "#ffffff",
                    color: "#334155",
                    fontSize: 11,
                    padding: "3px 8px",
                    cursor:
                      runningSkillId === item.skillId ||
                      !item.supported ||
                      !item.executable ||
                      !(item.category === "execution" || item.category === "planning")
                        ? "not-allowed"
                        : "pointer",
                  }}
                  title="execution/planning 스킬 실행 테스트"
                >
                  {runningSkillId === item.skillId ? "실행중" : "실행"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
