"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Sparkles, SendHorizontal, Bot, Paperclip, Lightbulb,
  TrendingUp, AlertTriangle, CheckCircle2, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BorderBeam } from "@/components/ui/border-beam";
import type { SpaceWorkItem } from "@/lib/work-item-types";

interface BoardIntelliSidebarProps {
  open: boolean;
  onClose: () => void;
  spaceName: string;
  items: SpaceWorkItem[];
  preloadedContext?: SpaceWorkItem | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
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
    body: "Team completed 0 items this week. Encourage moving In Review items to Done.",
  },
  {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    title: "At Risk",
    body: "2 work items have been In Progress for over 5 days without updates.",
  },
  {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "Well Done",
    body: "All critical-priority items are assigned. Great coverage!",
  },
];

function buildContext(items: SpaceWorkItem[], preloaded: SpaceWorkItem | null | undefined): string {
  if (preloaded) {
    return `Work item context loaded: "${preloaded.title}" (${preloaded.type}, status: ${preloaded.status}${preloaded.description ? `, description: ${preloaded.description}` : ""}).`;
  }
  return `Board context: ${items.length} total items, ${items.filter(i => i.status === "done").length} done, ${items.filter(i => i.status === "inprogress").length} in progress.`;
}

export function BoardIntelliSidebar({
  open,
  onClose,
  spaceName,
  items,
  preloadedContext,
}: BoardIntelliSidebarProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Preload context when a work item is opened
  React.useEffect(() => {
    if (!open) return;
    if (preloadedContext) {
      const contextMsg: Message = {
        id: uid(),
        role: "assistant",
        content: `🔍 Context loaded for **"${preloadedContext.title}"** (${preloadedContext.type} · ${preloadedContext.status}).\n\n${preloadedContext.description ? `📝 Description: ${preloadedContext.description}\n\n` : ""}I understand this work item fully. Ask me anything about it, or tell me what you'd like to change!`,
      };
      setMessages([contextMsg]);
      setInput("");
    } else if (messages.length === 0) {
      setMessages([]);
    }
  }, [open, preloadedContext]);

  React.useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput("");

    const userMsg: Message = { id: uid(), role: "user", content: msg };
    const context = buildContext(items, preloadedContext);
    const reply: Message = {
      id: uid(),
      role: "assistant",
      content: `🤖 I'm analyzing your board context for **${spaceName}**.\n\n${context}\n\n*Unify Intelli's reasoning engine will be connected in a future release. This is a preview of the interaction model.*`,
    };
    setMessages((m) => [...m, userMsg, reply]);
  }

  const hasMessages = messages.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.aside
            key="sidebar"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            className="fixed right-0 top-0 z-50 flex h-screen w-[400px] flex-col border-l border-border-subtle bg-panel shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-border-subtle px-4 py-3.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-[13.5px] font-semibold text-foreground">Unify Intelli</p>
                <p className="text-[10.5px] text-muted">{spaceName} · AI Insights</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-muted hover:bg-foreground/[0.06] hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {!hasMessages ? (
                /* Hero state */
                <div className="flex flex-1 flex-col items-center justify-center gap-5 p-5">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20">
                      <Lightbulb className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-foreground">Board Insights</h3>
                    <p className="mt-1 text-[12px] text-muted">
                      Ask anything about your board, get AI-generated recommendations, analysis, and answers.
                    </p>
                  </div>

                  {/* Insight cards */}
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
                            <p className="mt-0.5 text-[11.5px] text-muted">{card.body}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Suggestion chips */}
                  <div className="w-full">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Try asking</p>
                    <div className="flex flex-wrap gap-1.5">
                      {BOARD_SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="rounded-full border border-border-subtle bg-panel px-3 py-1.5 text-[11.5px] text-muted transition-colors hover:border-accent/40 hover:text-foreground"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Chat state */
                <div className="flex-1 space-y-3 overflow-y-auto scroll-thin p-4">
                  {messages.map((m) => (
                    <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-line",
                          m.role === "user"
                            ? "bg-accent text-white"
                            : "border border-border-subtle bg-panel-strong/30 text-foreground"
                        )}
                      >
                        {m.role === "assistant" && (
                          <div className="mb-1 flex items-center gap-1 text-[10.5px] font-semibold text-accent">
                            <Bot className="h-3 w-3" /> Unify Intelli
                          </div>
                        )}
                        {m.content}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}

              {/* Composer */}
              <div className="border-t border-border-subtle p-3">
                {hasMessages && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {BOARD_SUGGESTIONS.slice(0, 3).map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border border-border-subtle bg-panel px-2.5 py-1 text-[10.5px] text-muted transition-colors hover:border-accent/40 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-panel shadow-sm">
                  <BorderBeam size={48} duration={10} colorFrom="var(--accent)" colorTo="transparent" />
                  <div className="relative z-10 flex items-end gap-2 p-2.5">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      rows={1}
                      placeholder="Ask about this board…"
                      className="max-h-24 flex-1 resize-none bg-transparent px-1 py-2 text-[13px] text-foreground placeholder:text-muted focus:outline-none"
                    />
                    <button
                      onClick={() => send()}
                      disabled={!input.trim()}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-40"
                      aria-label="Send"
                    >
                      <SendHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
