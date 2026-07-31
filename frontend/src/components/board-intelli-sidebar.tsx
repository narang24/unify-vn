"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Lightbulb, TrendingUp, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BorderBeam } from "@/components/ui/border-beam";
import { IntelliMessageInput } from "@/components/intelli-chat/intelli-message-input";
import { IntelliMessageThread } from "@/components/intelli-chat/intelli-message-thread";
import {
  getIntelliSession,
  sendIntelliMessage,
  type ApiIntelliMessage,
} from "@/lib/api";
import { localId, messageFromApi, resumeOrCreateIntelliSession, type IntelliChatMessage } from "@/lib/intelli-types";
import type { SpaceWorkItem } from "@/lib/work-item-types";

interface BoardIntelliSidebarProps {
  open: boolean;
  onClose: () => void;
  spaceName: string;
  /** Used as the fallback chat context (contextType "space") when no work item is preloaded. */
  spaceId: string;
  items: SpaceWorkItem[];
  preloadedContext?: SpaceWorkItem | null;
}

const BOARD_SUGGESTIONS = [
  "What's the overall health of this board?",
  "Which items are overdue or at risk?",
  "Recommend priorities for this week",
  "Who has the most workload right now?",
  "Summarize blocked work items",
];

const INSIGHT_CARDS = [
  {
    icon: TrendingUp,
    color: "text-accent",
    bg: "bg-accent/10",
    title: "Velocity",
    body: "Ask Unify Intelli how the team is trending this sprint.",
  },
  {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    title: "At Risk",
    body: "Ask which items have gone stale without an update.",
  },
  {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "Coverage",
    body: "Ask whether every work item has an owner assigned.",
  },
];

export function BoardIntelliSidebar({ open, onClose, spaceName, spaceId, items, preloadedContext }: BoardIntelliSidebarProps) {
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<IntelliChatMessage[]>([]);
  const [loadingSession, setLoadingSession] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Resume (or create) a session scoped to the work item, or to the board itself.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingSession(true);
    setMessages([]);
    setSessionId(null);

    const contextType = preloadedContext ? "work_item" : "space";
    const contextId = preloadedContext ? preloadedContext.id : spaceId;

    resumeOrCreateIntelliSession(contextType, contextId)
      .then((session) => getIntelliSession(session.id))
      .then(({ session, messages: msgs }) => {
        if (cancelled) return;
        setSessionId(session.id);
        setMessages(msgs.map(messageFromApi));
      })
      .catch((err) => {
        console.error("[BoardIntelliSidebar] failed to resume session", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingSession(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preloadedContext?.id, spaceId]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || !sessionId || sending) return;
    setInput("");
    setSending(true);

    const userMsg: IntelliChatMessage = { id: localId(), role: "user", content: msg, createdAt: new Date().toISOString() };
    const pendingMsg: IntelliChatMessage = { id: localId(), role: "assistant", content: "", pending: true };
    setMessages((m) => [...m, userMsg, pendingMsg]);

    try {
      const result = await sendIntelliMessage(sessionId, msg);
      if (result.message) {
        const assistantMsg = messageFromApi(result.message as ApiIntelliMessage);
        setMessages((m) => m.map((x) => (x.id === pendingMsg.id ? assistantMsg : x)));
      } else {
        setMessages((m) =>
          m.map((x) => (x.id === pendingMsg.id ? { ...x, pending: false, error: true, content: result.error ?? "Something went wrong." } : x)),
        );
      }
    } catch (err) {
      console.error("[BoardIntelliSidebar] send failed", err);
      setMessages((m) =>
        m.map((x) => (x.id === pendingMsg.id ? { ...x, pending: false, error: true, content: "Something went wrong." } : x)),
      );
    } finally {
      setSending(false);
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={onClose}
          />

          <motion.aside
            key="sidebar"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            className="fixed right-0 top-0 z-50 flex h-screen w-full flex-col border-l border-border-subtle bg-panel shadow-2xl sm:w-[400px]"
          >
            <div className="flex items-center gap-2.5 border-b border-border-subtle px-4 py-3.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-[13.5px] font-semibold text-foreground">Unify Intelli</p>
                <p className="truncate text-[10.5px] font-semibold text-muted">
                  {preloadedContext ? preloadedContext.title : `${spaceName} · AI Insights`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-muted hover:bg-foreground/[0.06] hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {loadingSession ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted" />
                </div>
              ) : !hasMessages ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-5">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20">
                      <Lightbulb className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-foreground">Board Insights</h3>
                    <p className="mt-1 text-[12px] font-semibold text-muted">
                      Ask anything about your board, get AI-generated recommendations, analysis, and answers.
                    </p>
                  </div>

                  <div className="w-full space-y-2">
                    {INSIGHT_CARDS.map((card, i) => {
                      const Icon = card.icon;
                      return (
                        <div key={i} className="flex gap-2.5 rounded-xl border border-border-subtle bg-panel-strong/30 p-3">
                          <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", card.bg)}>
                            <Icon className={cn("h-3.5 w-3.5", card.color)} />
                          </div>
                          <div>
                            <p className="text-[12.5px] font-semibold text-foreground">{card.title}</p>
                            <p className="mt-0.5 text-[11.5px] font-semibold text-muted">{card.body}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="w-full">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Try asking</p>
                    <div className="flex flex-wrap gap-1.5">
                      {BOARD_SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="rounded-full border border-border-subtle bg-panel px-3 py-1.5 text-[11.5px] font-semibold text-muted transition-colors hover:border-accent/40 hover:text-foreground"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto scroll-thin p-3">
                  <IntelliMessageThread ref={bottomRef} messages={messages} compact />
                </div>
              )}

              <div className="border-t border-border-subtle p-3">
                {hasMessages && !loadingSession && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {BOARD_SUGGESTIONS.slice(0, 3).map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border border-border-subtle bg-panel px-2.5 py-1 text-[10.5px] font-semibold text-muted transition-colors hover:border-accent/40 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative overflow-hidden rounded-2xl">
                  <BorderBeam size={48} duration={10} colorFrom="var(--accent)" colorTo="transparent" />
                  <IntelliMessageInput
                    value={input}
                    onChange={setInput}
                    onSend={() => send()}
                    sending={sending || loadingSession}
                    placeholder="Ask about this board…"
                  />
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
