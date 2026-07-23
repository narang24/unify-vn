"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, MousePointerClick, SendHorizontal, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContextChip } from "@/components/repo/context-chip";
import type { ChatMessage, ContextChip as ContextChipData } from "@/lib/repo-types";

function uid() {
    return Math.random().toString(36).slice(2, 9);
}

export function AiSidebar({
    open,
    onClose,
    repoName,
    selectMode,
    onToggleSelectMode,
    contextChips,
    onRemoveChip,
}: {
    open: boolean;
    onClose: () => void;
    repoName: string;
    selectMode: boolean;
    onToggleSelectMode: () => void;
    contextChips: ContextChipData[];
    onRemoveChip: (id: string) => void;
}) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "seed",
            role: "assistant",
            content: `Hi, I'm Unify Intelli 👋 I can see you're in ${repoName}. Select files, issues, or PRs (or highlight code) to add context, then ask me anything. Reasoning isn't wired up yet in this preview — this is the interface only.`,
        },
    ]);
    const [input, setInput] = useState("");

    function send() {
        if (!input.trim()) return;
        const userMsg: ChatMessage = {
            id: uid(),
            role: "user",
            content: input.trim(),
            contextChips: contextChips.length ? [...contextChips] : undefined,
        };
        const reply: ChatMessage = {
            id: uid(),
            role: "assistant",
            content:
                "🔧 Unify Intelli's reasoning engine isn't connected in this preview — this response is a placeholder so the chat UI can be reviewed end-to-end.",
        };
        setMessages((m) => [...m, userMsg, reply]);
        setInput("");
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 360, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
                    className="flex h-full shrink-0 flex-col overflow-hidden border-l border-border-subtle bg-panel"
                >
                    <div className="flex h-full shrink-0 flex-col" style={{ width: 360 }}>
                        {/* Header */}
                        <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                                <Sparkles className="h-4 w-4 text-accent" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold text-foreground">Ask Unify Intelli</p>
                                <p className="truncate text-[11px] text-muted">{repoName}</p>
                            </div>
                            <button
                                onClick={onToggleSelectMode}
                                className={cn(
                                    "flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium",
                                    selectMode ? "bg-accent/10 text-accent" : "text-muted hover:bg-black/5 hover:text-foreground",
                                )}
                                title="Toggle select mode to add files, folders, issues, and PRs as context"
                            >
                                <MousePointerClick className="h-3.5 w-3.5" /> Select
                            </button>
                            <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-black/5" aria-label="Close">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 space-y-3 overflow-y-auto scroll-thin p-3">
                            {messages.map((m) => (
                                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                                    <div
                                        className={cn(
                                            "max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed",
                                            m.role === "user"
                                                ? "bg-accent text-white"
                                                : "border border-border-subtle bg-panel-strong/30 text-foreground",
                                        )}
                                    >
                                        {m.role === "assistant" && (
                                            <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-accent">
                                                <Bot className="h-3 w-3" /> Unify Intelli
                                            </div>
                                        )}
                                        {m.contextChips && m.contextChips.length > 0 && (
                                            <div className="mb-1.5 flex flex-wrap gap-1">
                                                {m.contextChips.map((c) => (
                                                    <ContextChip key={c.id} chip={c} />
                                                ))}
                                            </div>
                                        )}
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Context chips row */}
                        {contextChips.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 border-t border-border-subtle px-3 py-2">
                                {contextChips.map((c) => (
                                    <ContextChip key={c.id} chip={c} onRemove={onRemoveChip} />
                                ))}
                            </div>
                        )}

                        {/* Input */}
                        <div className="flex items-end gap-1.5 border-t border-border-subtle p-2.5">
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
                                placeholder="Ask about this repository…"
                                className="max-h-24 flex-1 resize-none rounded-xl border border-border-subtle bg-white/55 px-3 py-2 text-[12.5px] text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            />
                            <button
                                onClick={send}
                                disabled={!input.trim()}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-40"
                                aria-label="Send"
                            >
                                <SendHorizontal className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}