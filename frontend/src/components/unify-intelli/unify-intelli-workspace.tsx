"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Filter, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IntelliSidebar, type IntelliPanel } from "@/components/unify-intelli/intelli-sidebar";
import { IntelliMessageInput } from "@/components/intelli-chat/intelli-message-input";
import { IntelliMessageThread } from "@/components/intelli-chat/intelli-message-thread";
import {
  createIntelliSession,
  deleteIntelliSession,
  getIntelliSession,
  listIntelliSessions,
  sendIntelliMessage,
  type ApiIntelliMessage,
  type ApiIntelliSession,
} from "@/lib/api";
import {
  localId,
  messageFromApi,
  resumeOrCreateIntelliSession,
  sessionToChat,
  type IntelliChat,
  type IntelliChatMessage,
} from "@/lib/intelli-types";
import type { SpaceWorkItem } from "@/lib/work-item-types";
import type { WorkItemPayload } from "@/components/edit-work-item-dialog";

/** Replace (or insert at the front of) the session list, keeping it sorted by recency. */
function upsertChat(list: IntelliChat[], session: ApiIntelliSession): IntelliChat[] {
  const next = sessionToChat(session);
  const withoutExisting = list.filter((c) => c.id !== next.id);
  return [next, ...withoutExisting].sort((a, b) => (a.updatedAtIso < b.updatedAtIso ? 1 : -1));
}

const SUGGESTIONS = [
  "Why did the last deployment fail?",
  "Summarize open pull requests",
  "What's in my backlog?",
  "Explain the auth flow",
];

export function UnifyIntelliWorkspace({
  preloadedContext,
  onReviewChanges,
}: {
  preloadedContext?: SpaceWorkItem | null;
  /**
   * Kept for backwards compatibility with callers that expect structured
   * change suggestions. The backend currently returns plain-text replies
   * only, so this is never invoked yet.
   */
  onReviewChanges?: (payload: WorkItemPayload) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [panel, setPanel] = useState<IntelliPanel>("home");
  const [chats, setChats] = useState<IntelliChat[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<IntelliChatMessage[]>([]);
  const [loadingActive, setLoadingActive] = useState(false);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  // Load the user's chat history once on mount.
  useEffect(() => {
    let cancelled = false;
    listIntelliSessions()
      .then((sessions) => {
        if (cancelled) return;
        setChats(sessions.map((s) => sessionToChat(s)));
      })
      .catch((err) => console.error("[UnifyIntelliWorkspace] failed to load sessions", err))
      .finally(() => {
        if (!cancelled) setLoadingSessions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // When opened with a preloaded work item, resume (or create) its session and load it.
  useEffect(() => {
    if (!preloadedContext) return;
    let cancelled = false;
    setLoadingActive(true);
    resumeOrCreateIntelliSession("work_item", preloadedContext.id)
      .then((session) => getIntelliSession(session.id))
      .then(({ session, messages }) => {
        if (cancelled) return;
        setChats((prev) => upsertChat(prev, session));
        setActiveChatId(session.id);
        setActiveMessages(messages.map(messageFromApi));
        setPanel("home");
      })
      .catch((err) => console.error("[UnifyIntelliWorkspace] failed to resume work item session", err))
      .finally(() => {
        if (!cancelled) setLoadingActive(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadedContext?.id]);

  function startNewChat() {
    setActiveChatId(null);
    setActiveMessages([]);
    setPanel("home");
  }

  async function selectChat(id: string) {
    setActiveChatId(id);
    setPanel("home");
    setLoadingActive(true);
    try {
      const { session, messages } = await getIntelliSession(id);
      setChats((prev) => upsertChat(prev, session));
      setActiveMessages(messages.map(messageFromApi));
    } catch (err) {
      console.error("[UnifyIntelliWorkspace] failed to load session", err);
    } finally {
      setLoadingActive(false);
    }
  }

  async function deleteChat(id: string) {
    try {
      await deleteIntelliSession(id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (activeChatId === id) {
        setActiveChatId(null);
        setActiveMessages([]);
      }
    } catch (err) {
      console.error("[UnifyIntelliWorkspace] failed to delete session", err);
    }
  }

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    const userMsg: IntelliChatMessage = { id: localId(), role: "user", content: text, createdAt: new Date().toISOString() };
    const pendingMsg: IntelliChatMessage = { id: localId(), role: "assistant", content: "", pending: true };
    setActiveMessages((m) => [...m, userMsg, pendingMsg]);

    try {
      let sessionId = activeChatId;
      if (!sessionId) {
        const session = await createIntelliSession();
        sessionId = session.id;
        setActiveChatId(sessionId);
        setChats((prev) => upsertChat(prev, session));
      }

      const result = await sendIntelliMessage(sessionId, text);
      if (result.message) {
        const assistantMsg = messageFromApi(result.message as ApiIntelliMessage);
        setActiveMessages((m) => m.map((x) => (x.id === pendingMsg.id ? assistantMsg : x)));
        if (result.session) setChats((prev) => upsertChat(prev, result.session as ApiIntelliSession));
      } else {
        setActiveMessages((m) =>
          m.map((x) => (x.id === pendingMsg.id ? { ...x, pending: false, error: true, content: result.error ?? "Something went wrong." } : x)),
        );
      }
    } catch (err) {
      console.error("[UnifyIntelliWorkspace] send failed", err);
      setActiveMessages((m) =>
        m.map((x) => (x.id === pendingMsg.id ? { ...x, pending: false, error: true, content: "Something went wrong." } : x)),
      );
    } finally {
      setSending(false);
    }
  }

  const filteredChats = chats.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-full">
      <IntelliSidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        activePanel={panel}
        onSelectPanel={setPanel}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={selectChat}
        onNewChat={startNewChat}
        onDeleteChat={deleteChat}
        loading={loadingSessions}
        search={search}
        onSearchChange={setSearch}
      />

      <div className="dotted-glow relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {panel !== "chats" && <DynamicOrbs />}
        <AnimatePresence mode="wait">
          {panel === "chats" ? (
            <motion.div
              key="chat-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 pt-4 pb-8"
            >
              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Chats</h1>
                <button className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-panel px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:border-accent/50 hover:text-foreground">
                  <Filter className="h-4 w-4" /> Filter
                </button>
              </div>
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Chats"
                  className="h-8 pl-8 text-[12px] font-medium"
                />
              </div>
              <div className="flex-1 overflow-y-auto scroll-thin">
                {loadingSessions ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {filteredChats.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => selectChat(chat.id)}
                        className="flex flex-col items-start gap-0.5 rounded-lg border border-border-subtle bg-panel px-3 py-2 text-left transition-colors hover:border-accent/50 hover:bg-foreground/[0.04]"
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold text-foreground">{chat.title}</span>
                        </div>
                        {chat.preview && <span className="w-full truncate text-[11.5px] text-muted">{chat.preview}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {!loadingSessions && filteredChats.length === 0 && (
                  <div className="mt-12 text-center text-[13px] text-muted">No chats match your search.</div>
                )}
              </div>
            </motion.div>
          ) : !activeChat && activeMessages.length === 0 ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center gap-6 px-4"
            >
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent ring-1 ring-accent/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">How can I help you ship today?</h1>
                <p className="mt-1.5 text-[13px] text-muted">
                  Ask about your repositories, deployments, issues and work items.
                </p>
              </div>

              <IntelliMessageInput
                value={input}
                onChange={setInput}
                onSend={() => send()}
                sending={sending}
                className="w-full"
                autoFocus
              />

              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="rounded-full border border-border-subtle bg-panel px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-accent/50 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex h-full flex-col"
            >
              <div className="flex-1 overflow-y-auto scroll-thin p-4 sm:p-6">
                {loadingActive ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted" />
                  </div>
                ) : activeMessages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-[13px] text-muted">
                    Send a message to start this conversation.
                  </div>
                ) : (
                  <IntelliMessageThread messages={activeMessages} compact={false} className="mx-auto w-full max-w-3xl" />
                )}
              </div>
              <div className="border-t border-border-subtle p-3 sm:p-4">
                <IntelliMessageInput
                  value={input}
                  onChange={setInput}
                  onSend={() => send()}
                  sending={sending}
                  className="mx-auto w-full max-w-3xl"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DynamicOrbs() {
  return (
    <div className="!absolute !inset-0 pointer-events-none overflow-hidden">
      {/* Orb 1: Cyan/Teal */}
      <motion.div
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -60, 70, 0],
          scale: [1, 1.2, 0.8, 1],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[20%] top-[10%] h-[450px] w-[450px] rounded-full opacity-30 blur-[80px]"
        style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
      />
      {/* Orb 2: Deep Blue */}
      <motion.div
        animate={{
          x: [0, -70, 50, 0],
          y: [0, 70, -40, 0],
          scale: [1, 1.1, 1.3, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute left-[50%] top-[30%] h-[550px] w-[550px] rounded-full opacity-25 blur-[90px]"
        style={{ background: "radial-gradient(circle, #4facfe 0%, transparent 70%)" }}
      />
      {/* Orb 3: Emerald */}
      <motion.div
        animate={{
          x: [0, 50, -60, 0],
          y: [0, 40, -60, 0],
          scale: [1, 1.3, 1, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute left-[30%] top-[45%] h-[400px] w-[400px] rounded-full opacity-25 blur-[70px]"
        style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }}
      />
    </div>
  );
}
