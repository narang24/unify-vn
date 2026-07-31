// ─── Unify Intelli chat view-models ────────────────────────────────────────
// Thin adapters over the real `/api/v1/intelli/*` endpoints (see
// `frontend/src/lib/api.ts`). All three chat surfaces (the full-page
// workspace, the board sidebar, and the repo sidebar) share these shapes so
// message rendering can be reused.

import { createIntelliSession, listIntelliSessions, type ApiIntelliMessage, type ApiIntelliSession, type IntelliContextType } from "@/lib/api";

export type { IntelliContextType };

export interface IntelliChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** ISO timestamp from the server; absent for optimistic/local-only messages. */
  createdAt?: string;
  /** True while waiting for the assistant's reply to this turn. */
  pending?: boolean;
  /** True if the assistant failed to reply (message shown as an inline error). */
  error?: boolean;
}

export interface IntelliChat {
  id: string;
  title: string;
  preview: string;
  updatedAtIso: string;
  contextType: IntelliContextType | null;
  contextId: string | null;
  messages: IntelliChatMessage[];
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function localId() {
  return `local_${uid()}`;
}

export function messageFromApi(m: ApiIntelliMessage): IntelliChatMessage {
  return { id: m.id, role: m.role, content: m.content, createdAt: m.createdAt };
}

export function sessionToChat(session: ApiIntelliSession, messages: IntelliChatMessage[] = []): IntelliChat {
  return {
    id: session.id,
    title: session.title?.trim() || "New chat",
    preview: session.lastMessage?.content ?? "",
    updatedAtIso: session.updatedAt,
    contextType: session.contextType,
    contextId: session.contextId,
    messages,
  };
}

/** Compact relative-time label used in chat list rows ("2h ago", "Yesterday", ...). */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 30) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** Compact clock label used under individual messages ("2:41 PM"). */
export function formatMessageTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Session-resume strategy for context-scoped chat surfaces (work item /
 * repository / space sidebars): reuse the most recently updated session that
 * already matches this exact context, so reopening "Ask Unify Intelli" on
 * the same item continues the conversation instead of spawning a new one
 * each time. Falls back to creating a fresh session if none exists yet.
 */
export async function resumeOrCreateIntelliSession(
  contextType: IntelliContextType,
  contextId: string,
): Promise<ApiIntelliSession> {
  try {
    const sessions = await listIntelliSessions();
    const existing = sessions.find((s) => s.contextType === contextType && s.contextId === contextId);
    if (existing) return existing;
  } catch {
    // If listing fails, fall through to creating a fresh session.
  }
  return createIntelliSession({ contextType, contextId });
}
