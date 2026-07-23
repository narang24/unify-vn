// ─── Unify Intelli workspace domain types (UI-only, mock data) ────────────
// Mirrors the approach in repo-types.ts: this wires up the UI/UX for the
// dedicated AI workspace. No backend calls yet — all data is seeded so the
// interaction model can be reviewed before Unify Intelli is wired to a
// real reasoning engine.

export interface IntelliChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface IntelliChat {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  messages: IntelliChatMessage[];
}

export const SEED_CHATS: IntelliChat[] = [
  {
    id: "chat_1",
    title: "Refresh token rotation bug",
    preview: "Can you help me trace why refresh tokens silently expire without...",
    updatedAt: "2h ago",
    messages: [],
  },
  {
    id: "chat_2",
    title: "Sprint 4 planning",
    preview: "Summarize what's left in the backlog before we start the sprint...",
    updatedAt: "Yesterday",
    messages: [],
  },
  {
    id: "chat_3",
    title: "Onboarding flow copy",
    preview: "Give me three tone options for the empty-state on the dashboard...",
    updatedAt: "3 days ago",
    messages: [],
  },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function newChat(): IntelliChat {
  return {
    id: `chat_${uid()}`,
    title: "New chat",
    preview: "",
    updatedAt: "Just now",
    messages: [],
  };
}
