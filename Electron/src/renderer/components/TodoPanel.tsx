/**
 * TodoPanel — .omx/state/todo-state.json 기반 할 일 목록 패널
 *
 * OMX 에이전트가 `todo-state.json`을 작성하면 실시간으로 업데이트된다.
 * 상태별 아이콘:
 *   completed    → ✓ 초록
 *   in-progress  → ● 파랑 (현재 진행 중)
 *   not-started  → ○ 회색
 *
 * 데이터 형식 (todo-state.json):
 * {
 *   "todoList": [
 *     { "id": 1, "title": "...", "status": "completed" | "in-progress" | "not-started" }
 *   ]
 * }
 */

import React, { useEffect, useRef, useState } from "react";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type TodoStatus = "not-started" | "in-progress" | "completed";

export interface TodoItem {
  id: number;
  title: string;
  status: TodoStatus;
}

export interface TodoState {
  todoList: TodoItem[];
}

// ─── 상태별 스타일 ────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<
  TodoStatus,
  { icon: string; color: string; lineThrough: boolean; opacity: number }
> = {
  completed:   { icon: "✓", color: "#22c55e", lineThrough: false, opacity: 0.7 },
  "in-progress": { icon: "●", color: "#3b82f6", lineThrough: false, opacity: 1 },
  "not-started": { icon: "○", color: "#9ca3af", lineThrough: false, opacity: 0.6 },
};

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export const TodoPanel: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const unsubRef = useRef<(() => void) | null>(null);

  // ── 초기 로드 + 실시간 구독 ─────────────────────────────────────────────────
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    if (api.getTodoList) {
      api.getTodoList().then((state: TodoState) => {
        setTodos(state.todoList ?? []);
      }).catch(console.error);
    }

    if (api.onTodoChange) {
      unsubRef.current = api.onTodoChange((state: TodoState) => {
        setTodos(state.todoList ?? []);
      });
    }

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, []);

  // ── 통계 ───────────────────────────────────────────────────────────────────
  const total = todos.length;
  const done = todos.filter((t) => t.status === "completed").length;

  // ── 렌더링 ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* 섹션 헤더 */}
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>할 일</span>
        {total > 0 && (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: done === total ? "#22c55e" : "#6b7280",
              backgroundColor: done === total ? "#dcfce7" : "#f3f4f6",
              padding: "1px 6px",
              borderRadius: "9999px",
            }}
          >
            {done}/{total}
          </span>
        )}
      </div>

      {/* 할 일 없음 */}
      {total === 0 ? (
        <div
          style={{
            fontSize: "12px",
            color: "#d1d5db",
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          할 일 없음
        </div>
      ) : (
        /* 목록 */
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {todos.map((item) => {
            const style = STATUS_STYLE[item.status];
            return (
              <li
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "7px",
                  opacity: style.opacity,
                  padding: "3px 0",
                }}
              >
                {/* 상태 아이콘 */}
                <span
                  style={{
                    fontSize: item.status === "in-progress" ? "10px" : "13px",
                    color: style.color,
                    lineHeight: "18px",
                    flexShrink: 0,
                    fontWeight: item.status === "completed" ? 700 : 400,
                  }}
                >
                  {style.icon}
                </span>

                {/* 제목 */}
                <span
                  style={{
                    fontSize: "12px",
                    color: item.status === "in-progress" ? "#1d4ed8" : "#374151",
                    lineHeight: "1.5",
                    wordBreak: "break-word",
                    fontWeight: item.status === "in-progress" ? 500 : 400,
                  }}
                >
                  {item.title}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
