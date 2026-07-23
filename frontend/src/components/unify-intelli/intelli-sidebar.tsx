"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus, MessageSquare, Clock, ChevronsLeft, ChevronsRight, Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { IntelliChat } from "@/lib/intelli-types";

export type IntelliPanel = "home" | "chats" | "recents";

export function IntelliSidebar({
  collapsed,
  onToggleCollapsed,
  activePanel,
  onSelectPanel,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  search,
  onSearchChange,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  activePanel: IntelliPanel;
  onSelectPanel: (p: IntelliPanel) => void;
  chats: IntelliChat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const recents = [...chats].slice(0, 6);
  const filteredChats = chats.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 260 }}
      transition={{ type: "tween", duration: 0.18, ease: "easeOut" }}
      className="flex h-full shrink-0 flex-col overflow-hidden border-r border-border-subtle bg-panel"
    >
      <div className="flex items-center gap-1.5 border-b border-border-subtle p-2.5">
        {!collapsed && <span className="flex-1 truncate text-[12px] font-semibold uppercase tracking-wide text-muted">Unify Intelli</span>}
        <button
          onClick={onToggleCollapsed}
          className="ml-auto rounded-md p-1 text-muted hover:bg-black/5 hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className="space-y-0.5 p-2">
        <button
          onClick={onNewChat}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg bg-accent px-2.5 py-2 text-[12.5px] font-medium text-white hover:bg-accent-soft",
            collapsed && "justify-center px-0",
          )}
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && "New Chat"}
        </button>
        <button
          onClick={() => onSelectPanel("chats")}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium hover:bg-black/5",
            activePanel === "chats" ? "bg-accent/10 text-accent" : "text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && "Chats"}
        </button>
        <button
          onClick={() => onSelectPanel("recents")}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium hover:bg-black/5",
            activePanel === "recents" ? "bg-accent/10 text-accent" : "text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && "Recents"}
        </button>
      </div>

      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto scroll-thin px-2 pb-2">
          <AnimatePresence mode="wait">
            {activePanel === "chats" && (
              <motion.div key="chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                <div className="flex items-center justify-between px-1 py-2">
                  <span className="text-[12.5px] font-semibold text-foreground">Chats</span>
                  <button className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted hover:bg-black/5 hover:text-foreground">
                    <Filter className="h-3 w-3" /> Filter
                  </button>
                </div>
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                  <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search Chats"
                    className="h-8 pl-8 text-[12px]"
                  />
                </div>
                <div className="space-y-0.5">
                  {filteredChats.map((chat) => (
                    <ChatRow key={chat.id} chat={chat} active={chat.id === activeChatId} onClick={() => onSelectChat(chat.id)} />
                  ))}
                  {filteredChats.length === 0 && (
                    <p className="px-1.5 py-3 text-center text-[11.5px] text-muted">No chats match your search.</p>
                  )}
                </div>
              </motion.div>
            )}

            {activePanel === "recents" && (
              <motion.div key="recents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                <p className="px-1 py-2 text-[12.5px] font-semibold text-foreground">Recents</p>
                <div className="space-y-0.5">
                  {recents.map((chat) => (
                    <ChatRow key={chat.id} chat={chat} active={chat.id === activeChatId} onClick={() => onSelectChat(chat.id)} />
                  ))}
                </div>
              </motion.div>
            )}

            {activePanel === "home" && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                <p className="px-1 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted">Recent</p>
                <div className="space-y-0.5">
                  {recents.slice(0, 4).map((chat) => (
                    <ChatRow key={chat.id} chat={chat} active={chat.id === activeChatId} onClick={() => onSelectChat(chat.id)} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.aside>
  );
}

function ChatRow({ chat, active, onClick }: { chat: IntelliChat; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-black/5",
        active && "bg-accent/10",
      )}
    >
      <span className={cn("w-full truncate text-[12.5px] font-medium", active ? "text-accent" : "text-foreground")}>
        {chat.title}
      </span>
      {chat.preview && (
        <span className="w-full truncate text-[11px] text-muted">{chat.preview}</span>
      )}
      <span className="text-[10px] text-muted/70">{chat.updatedAt}</span>
    </button>
  );
}
