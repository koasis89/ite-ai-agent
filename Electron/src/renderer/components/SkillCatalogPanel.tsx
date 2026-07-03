import React, { useEffect, useMemo, useState } from "react";

type SkillItem = {
  skillId?: string;
  name: string;
  enabled: boolean;
};

type LoadState = "idle" | "loading" | "done" | "error";

export default function SkillCatalogPanel(): React.ReactElement {
  const [items, setItems] = useState<SkillItem[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setState("loading");
      setError("");

      try {
        const result = await window.electronAPI?.getSkillCatalog?.();
        if (!mounted) return;

        if (!result?.ok || !Array.isArray(result.data)) {
          setState("error");
          setError(result?.error || "스킬 목록을 불러오지 못했습니다.");
          return;
        }

        setItems(result.data);
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
  }, []);

  const enabledCount = useMemo(
    () => items.filter((item) => item.enabled).length,
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
              <div className="skill-catalog-item-name">{item.name}</div>
              <span
                className={
                  item.enabled
                    ? "skill-catalog-badge enabled"
                    : "skill-catalog-badge disabled"
                }
              >
                {item.enabled ? "enabled" : "disabled"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
