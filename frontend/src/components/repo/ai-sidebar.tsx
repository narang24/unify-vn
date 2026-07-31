"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb, X, ExternalLink, Loader2 } from "lucide-react";
import { ContextChip } from "@/components/repo/context-chip";
import { IntelliMessageInput } from "@/components/intelli-chat/intelli-message-input";
import { IntelliMessageThread } from "@/components/intelli-chat/intelli-message-thread";
import { getIntelliSession, sendIntelliMessage, type ApiIntelliMessage } from "@/lib/api";
import { localId, messageFromApi, resumeOrCreateIntelliSession, type IntelliChatMessage } from "@/lib/intelli-types";
import type { ContextChip as ContextChipData } from "@/lib/repo-types";

export function AiSidebar({
    open,
    onClose,
    repoName,
    repoId,
    contextChips,
    onRemoveChip,
    onOpenFullWorkspace,
}: {
    open: boolean;
    onClose: () => void;
    repoName: string;
    /** Repository id — used as the session's `contextId` (contextType "repository"). */
    repoId: string;
    /** Kept for backwards compatibility with callers still tracking select mode externally. */
    selectMode?: boolean;
    onToggleSelectMode?: () => void;
    contextChips: ContextChipData[];
    onRemoveChip: (id: string) => void;
    /** Opens the full, dedicated Unify Intelli workspace — continuing this conversation there. */
    onOpenFullWorkspace?: () => void;
}) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<IntelliChatMessage[]>([]);
    const [loadingSession, setLoadingSession] = useState(false);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setLoadingSession(true);
        resumeOrCreateIntelliSession("repository", repoId)
            .then((session) => getIntelliSession(session.id))
            .then(({ session, messages: msgs }) => {
                if (cancelled) return;
                setSessionId(session.id);
                setMessages(msgs.map(messageFromApi));
            })
            .catch((err) => console.error("[AiSidebar] failed to resume session", err))
            .finally(() => {
                if (!cancelled) setLoadingSession(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open, repoId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function send() {
        const text = input.trim();
        if (!text || !sessionId || sending) return;
        setInput("");
        setSending(true);

        const userMsg: IntelliChatMessage = { id: localId(), role: "user", content: text, createdAt: new Date().toISOString() };
        const pendingMsg: IntelliChatMessage = { id: localId(), role: "assistant", content: "", pending: true };
        setMessages((m) => [...m, userMsg, pendingMsg]);

        try {
            const result = await sendIntelliMessage(sessionId, text);
            if (result.message) {
                const assistantMsg = messageFromApi(result.message as ApiIntelliMessage);
                setMessages((m) => m.map((x) => (x.id === pendingMsg.id ? assistantMsg : x)));
            } else {
                setMessages((m) =>
                    m.map((x) => (x.id === pendingMsg.id ? { ...x, pending: false, error: true, content: result.error ?? "Something went wrong." } : x)),
                );
            }
        } catch (err) {
            console.error("[AiSidebar] send failed", err);
            setMessages((m) =>
                m.map((x) => (x.id === pendingMsg.id ? { ...x, pending: false, error: true, content: "Something went wrong." } : x)),
            );
        } finally {
            setSending(false);
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "min(360px, 100vw)", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
                    className="fixed inset-y-0 right-0 z-40 flex h-full shrink-0 flex-col overflow-hidden border-l border-border-subtle bg-panel font-semibold sm:static sm:z-auto"
                >
                    <div className="flex h-full shrink-0 flex-col" style={{ width: "min(360px, 100vw)" }}>
                        {/* Header */}
                        <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                                <Lightbulb className="h-4 w-4 text-accent" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold text-foreground">Ask Unify Intelli</p>
                                <p className="truncate text-[11px] text-muted">{repoName}</p>
                            </div>
                            {onOpenFullWorkspace && (
                                <button
                                    onClick={onOpenFullWorkspace}
                                    className="rounded-md p-1 text-muted hover:bg-foreground/6 hover:text-foreground"
                                    aria-label="Open full Unify Intelli workspace"
                                    title="Open full Unify Intelli workspace"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </button>
                            )}
                            <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-foreground/6" aria-label="Close">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto scroll-thin p-3">
                            {loadingSession ? (
                                <div className="flex h-full items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20">
                                        <Lightbulb className="h-5 w-5 text-accent" />
                                    </div>
                                    <p className="text-[12.5px] font-semibold text-foreground">Hi, I&apos;m Unify Intelli</p>
                                    <p className="max-w-[240px] text-[11.5px] font-normal text-muted">
                                        Select files, issues, or PRs to add context, then ask me anything about {repoName}.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {contextChips.length > 0 && (
                                        <div className="mb-2 flex flex-wrap gap-1">
                                            {contextChips.map((c) => (
                                                <ContextChip key={c.id} chip={c} />
                                            ))}
                                        </div>
                                    )}
                                    <IntelliMessageThread ref={bottomRef} messages={messages} compact />
                                </>
                            )}
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
                        <div className="border-t border-border-subtle p-2.5">
                            <IntelliMessageInput
                                value={input}
                                onChange={setInput}
                                onSend={send}
                                sending={sending || loadingSession}
                                placeholder="Ask about this repository…"
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
