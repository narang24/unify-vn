"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, SendHorizontal, Sparkles, Copy, Share, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BorderBeam } from "@/components/ui/border-beam";
import { IntelliSidebar, type IntelliPanel } from "@/components/unify-intelli/intelli-sidebar";
import { SEED_CHATS, newChat, type IntelliChat, type IntelliChatMessage } from "@/lib/intelli-types";
import type { SpaceWorkItem } from "@/lib/work-item-types";
import type { WorkItemPayload } from "@/components/edit-work-item-dialog";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function UnifyIntelliWorkspace({
  preloadedContext,
  onReviewChanges,
}: {
  preloadedContext?: SpaceWorkItem | null;
  onReviewChanges?: (payload: WorkItemPayload) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [panel, setPanel] = useState<IntelliPanel>("home");
  const [chats, setChats] = useState<IntelliChat[]>(SEED_CHATS);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  useEffect(() => {
    if (preloadedContext) {
      const chat = newChat();
      chat.title = `Context: ${preloadedContext.title}`;
      
      const sysMsg: IntelliChatMessage = {
        id: uid(),
        role: "assistant",
        content: `🔍 Context loaded for **"${preloadedContext.title}"** (${preloadedContext.type} · ${preloadedContext.status}).\n\nI understand this work item fully. Ask me anything about it, or tell me what you'd like to change!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      chat.messages = [sysMsg];
      setChats((c) => [chat, ...c]);
      setActiveChatId(chat.id);
      setPanel("home");
    }
  }, [preloadedContext]);

  function startNewChat() {
    const chat = newChat();
    setChats((c) => [chat, ...c]);
    setActiveChatId(chat.id);
    setPanel("home");
  }

  function editMessage(msgId: string) {
    if (!activeChat) return;
    const msgIndex = activeChat.messages.findIndex((m) => m.id === msgId);
    if (msgIndex === -1) return;
    const msgToEdit = activeChat.messages[msgIndex];
    if (msgToEdit.role !== "user") return;

    setInput(msgToEdit.content);
    setChats((all) =>
      all.map((c) =>
        c.id === activeChat.id
          ? {
              ...c,
              messages: c.messages.slice(0, msgIndex),
            }
          : c
      )
    );
  }

  function send() {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");

    let targetId = activeChatId;
    if (!targetId) {
      const chat = newChat();
      chat.title = text.length > 40 ? `${text.slice(0, 40)}…` : text;
      setChats((c) => [chat, ...c]);
      targetId = chat.id;
      setActiveChatId(chat.id);
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: IntelliChatMessage = { id: uid(), role: "user", content: text, timestamp: nowTime };
    const isModification = preloadedContext && (text.toLowerCase().includes("change") || text.toLowerCase().includes("assign") || text.toLowerCase().includes("set"));
    
    const reply: IntelliChatMessage = {
      id: uid(),
      role: "assistant",
      content: isModification 
        ? "I have analyzed your request and prepared the suggested changes." 
        : "🔧 Unify Intelli's reasoning engine isn't connected in this preview — this response is a placeholder so the workspace UI can be reviewed end-to-end.",
      timestamp: nowTime,
      suggestedChanges: isModification ? {
        id: preloadedContext.id,
        title: preloadedContext.title,
        type: preloadedContext.type,
        assignee: text.toLowerCase().includes("vanshika") ? "Vanshika Narang" : "Alex Chen",
        dueDate: "2026-07-31",
      } : undefined
    };

    setChats((all) =>
      all.map((c) =>
        c.id === targetId
          ? { ...c, messages: [...c.messages, userMsg, reply], preview: text, updatedAt: "Just now" }
          : c,
      ),
    );
  }

  return (
    <div className="flex h-full">
      <IntelliSidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        activePanel={panel}
        onSelectPanel={setPanel}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => setActiveChatId(id)}
        onNewChat={startNewChat}
        search={search}
        onSearchChange={setSearch}
      />

      <div className="dotted-glow relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <DynamicOrbs />
        <AnimatePresence mode="wait">
          {!activeChat ? (
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

              <Composer value={input} onChange={setInput} onSend={send} />

              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "Why did the last deployment fail?",
                  "Summarize open pull requests",
                  "What's in my backlog?",
                  "Explain the auth flow",
                ].map((s) => (
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
              <div className="flex-1 space-y-3 overflow-y-auto scroll-thin p-4 sm:p-6">
                {activeChat.messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-[13px] text-muted">
                    Send a message to start this conversation.
                  </div>
                ) : (
                  activeChat.messages.map((m) => (
                    <div key={m.id} className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}>
                      {m.role === "assistant" ? (
                        <div className="flex flex-col items-start gap-1 w-full sm:max-w-[85%]">
                          <div className="flex items-center gap-1.5 mb-0.5 ml-1">
                            <img src="/unify-intelli-icon.png" alt="Unify Intelli" className="h-6 w-6 object-contain" />
                            <span className="text-[12px] font-semibold text-foreground">Unify Intelli</span>
                          </div>
                          <div className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed border border-border-subtle bg-panel-strong/30 text-foreground font-semibold">
                            <span className="whitespace-pre-wrap">{m.content}</span>
                            {m.suggestedChanges && (
                              <div className="mt-3 rounded-lg border border-border-subtle bg-panel p-3 shadow-sm font-normal">
                                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                                  <Sparkles className="h-3.5 w-3.5 text-accent" /> Suggested Changes
                                </div>
                                <div className="space-y-1 text-[11.5px] text-muted">
                                  <div><span className="font-medium text-foreground">Assignee:</span> {m.suggestedChanges.assignee}</div>
                                  <div><span className="font-medium text-foreground">Due Date:</span> {m.suggestedChanges.dueDate}</div>
                                </div>
                                {onReviewChanges && (
                                  <button
                                    onClick={() => onReviewChanges(m.suggestedChanges!)}
                                    className="mt-3 w-full rounded-md bg-accent py-1.5 text-[11.5px] font-semibold text-white hover:bg-accent-soft"
                                  >
                                    Review & Apply
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-start gap-3 w-full mt-0.5 px-2 text-[11px] text-muted">
                            <div className="flex items-center gap-2.5">
                              <button title="Copy" className="flex items-center hover:text-foreground transition-colors"><Copy className="h-3.5 w-3.5" /></button>
                              <button title="Share" className="flex items-center hover:text-foreground transition-colors"><Share className="h-3.5 w-3.5" /></button>
                            </div>
                            <span>{m.timestamp || "Just now"}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="group flex flex-col items-end w-full ml-auto sm:max-w-[85%]">
                          <div className="flex items-end gap-2.5">
                            <div className="flex flex-col items-end gap-1">
                              <div className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed bg-accent text-white font-semibold">
                                <span className="whitespace-pre-wrap">{m.content}</span>
                              </div>
                              <div className="flex items-center justify-end gap-3 w-full mt-0.5 px-1 text-[11px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
                                <span>{m.timestamp || "Just now"}</span>
                                <div className="flex items-center gap-2.5">
                                  <button title="Edit" onClick={() => editMessage(m.id)} className="flex items-center hover:text-foreground transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                                  <button title="Copy" className="flex items-center hover:text-foreground transition-colors"><Copy className="h-3.5 w-3.5" /></button>
                                  <button title="Share" className="flex items-center hover:text-foreground transition-colors"><Share className="h-3.5 w-3.5" /></button>
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 mb-6 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-[9px] font-bold text-white shadow-sm ring-[1.5px] ring-background">
                              VN
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-border-subtle p-3 sm:p-4">
                <Composer value={input} onChange={setInput} onSend={send} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="relative w-full rounded-[14px] border border-border-subtle bg-white shadow-sm">
      <BorderBeam
        duration={6}
        size={250}
        colorFrom="#00f2fe"
        colorTo="transparent"
        className="-inset-[1px]"
      />
      <BorderBeam
        duration={6}
        delay={3}
        size={250}
        colorFrom="#10b981"
        colorTo="transparent"
        className="-inset-[1px]"
      />
      <div className="relative z-10 flex items-end gap-1.5 p-1.5">
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 hover:text-black"
          aria-label="Attach a file"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          placeholder="Let's collaborate"
          className="max-h-32 flex-1 resize-none bg-transparent px-1 py-2 text-[13.5px] font-semibold text-black placeholder:text-gray-400 focus:outline-none"
        />
        <button
          onClick={onSend}
          disabled={!value.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-40"
          aria-label="Send"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
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
