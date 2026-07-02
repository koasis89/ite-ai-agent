import type { Message } from "../components/ChatContainer";

const STORAGE_KEY = "omx.desktop.chat.history.v1";
const MAX_SESSIONS = 50;

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

interface ChatHistoryStore {
  version: 1;
  sessions: ChatSession[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function createWelcomeMessage(): Message {
  return {
    id: "welcome",
    role: "system",
    content: "OMX desktop development shell is running.",
  };
}

function defaultSession(): ChatSession {
  const now = nowIso();
  return {
    id: `chat-${Date.now()}`,
    title: "새 채팅",
    createdAt: now,
    updatedAt: now,
    messages: [createWelcomeMessage()],
  };
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeStore(input: unknown): ChatHistoryStore {
  if (!input || typeof input !== "object") {
    return { version: 1, sessions: [defaultSession()] };
  }

  const typed = input as Partial<ChatHistoryStore>;
  const sessions = Array.isArray(typed.sessions) ? typed.sessions : [];

  const normalized = sessions
    .filter((s): s is ChatSession => !!s && typeof s === "object")
    .map((s) => {
      const createdAt = typeof s.createdAt === "string" ? s.createdAt : nowIso();
      const updatedAt = typeof s.updatedAt === "string" ? s.updatedAt : createdAt;
      const title = typeof s.title === "string" && s.title.trim() ? s.title : "새 채팅";
      const id = typeof s.id === "string" && s.id.trim() ? s.id : `chat-${Date.now()}`;
      const messages = Array.isArray(s.messages) && s.messages.length > 0
        ? s.messages
        : [createWelcomeMessage()];

      return {
        id,
        title,
        createdAt,
        updatedAt,
        messages,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return {
    version: 1,
    sessions: normalized.length > 0 ? normalized : [defaultSession()],
  };
}

function loadStore(): ChatHistoryStore {
  if (typeof window === "undefined" || !window.localStorage) {
    return { version: 1, sessions: [defaultSession()] };
  }

  const parsed = safeJsonParse<unknown>(window.localStorage.getItem(STORAGE_KEY));
  return normalizeStore(parsed);
}

function saveStore(store: ChatHistoryStore): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function deriveTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim().length > 0);
  if (!firstUser) return "새 채팅";

  const oneLine = firstUser.content.replace(/\s+/g, " ").trim();
  return oneLine.length > 28 ? `${oneLine.slice(0, 28)}...` : oneLine;
}

export function listChatSessions(): ChatSession[] {
  const store = loadStore();
  return [...store.sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function ensureSession(sessionId?: string): ChatSession {
  const store = loadStore();

  if (sessionId) {
    const matched = store.sessions.find((s) => s.id === sessionId);
    if (matched) return matched;
  }

  const first = store.sessions[0];
  if (first) return first;

  const created = defaultSession();
  saveStore({ version: 1, sessions: [created] });
  return created;
}

export function createChatSession(): ChatSession {
  const store = loadStore();
  const created = defaultSession();

  const nextSessions = [created, ...store.sessions].slice(0, MAX_SESSIONS);
  saveStore({ version: 1, sessions: nextSessions });
  return created;
}

export function deleteChatSession(sessionId: string): ChatSession {
  const store = loadStore();
  const filtered = store.sessions.filter((s) => s.id !== sessionId);

  const nextSessions = filtered.length > 0 ? filtered : [defaultSession()];
  saveStore({ version: 1, sessions: nextSessions });
  return nextSessions[0];
}

export function upsertChatSession(sessionId: string, messages: Message[]): ChatSession {
  const store = loadStore();
  const now = nowIso();

  const base = store.sessions.find((s) => s.id === sessionId);
  const next: ChatSession = {
    id: sessionId,
    title: deriveTitle(messages),
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
    messages: messages.length > 0 ? messages : [createWelcomeMessage()],
  };

  const rest = store.sessions.filter((s) => s.id !== sessionId);
  const nextSessions = [next, ...rest].slice(0, MAX_SESSIONS);
  saveStore({ version: 1, sessions: nextSessions });

  return next;
}
