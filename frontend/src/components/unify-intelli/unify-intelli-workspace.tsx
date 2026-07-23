"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, SendHorizontal, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { BorderBeam } from "@/components/ui/border-beam";
import { Logo3D } from "@/components/unify-intelli/logo-3d";
import { IntelliSidebar, type IntelliPanel } from "@/components/unify-intelli/intelli-sidebar";
import { SEED_CHATS, newChat, type IntelliChat, type IntelliChatMessage } from "@/lib/intelli-types";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function UnifyIntelliWorkspace() {
  const [collapsed, setCollapsed] = useState(false);
  const [panel, setPanel] = useState<IntelliPanel>("home");
  const [chats, setChats] = useState<IntelliChat[]>(SEED_CHATS);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  function startNewChat() {
    const chat = newChat();
    setChats((c) => [chat, ...c]);
    setActiveChatId(chat.id);
    setPanel("home");
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

    const userMsg: IntelliChatMessage = { id: uid(), role: "user", content: text };
    const reply: IntelliChatMessage = {
      id: uid(),
      role: "assistant",
      content: "🔧 Unify Intelli's reasoning engine isn't connected in this preview — this response is a placeholder so the workspace UI can be reviewed end-to-end.",
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

      <div className="dotted-glow flex min-w-0 flex-1 flex-col">
        <AnimatePresence mode="wait">
          {!activeChat ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex h-full flex-col items-center justify-center gap-6 px-4"
            >
              <Logo3D />
              <div className="text-center">
                <h1 className="font-display text-2xl italic font-semibold text-foreground sm:text-3xl">
                  Let Unify Intelli merge your ideas!
                </h1>
                <p className="mt-1.5 text-[13px] text-muted">
                  Ask about your repos, issues, and work items — all in one place.
                </p>
              </div>

              <Composer value={input} onChange={setInput} onSend={send} />
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
                    <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed sm:max-w-[70%]",
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
                        {m.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-border-subtle p-3 sm:p-4">
                <Composer value={input} onChange={setInput} onSend={send} compact />
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
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border-subtle bg-panel shadow-[0_18px_42px_rgba(1,106,131,0.12)]",
        compact ? "max-w-2xl" : "max-w-xl",
      )}
    >
      <BorderBeam size={80} duration={7} />
      <div className="relative z-10 flex items-end gap-2 p-2.5">
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-foreground/[0.06] hover:text-foreground"
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
          className="max-h-32 flex-1 resize-none bg-transparent px-1 py-2 text-[13.5px] text-foreground placeholder:text-muted focus:outline-none"
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
