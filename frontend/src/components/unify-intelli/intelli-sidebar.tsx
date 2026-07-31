"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus, MessageSquare, PanelLeftClose, PanelLeftOpen, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatRelativeTime, type IntelliChat } from "@/lib/intelli-types";

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
  onDeleteChat,
  loading,
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
  onDeleteChat: (id: string) => void;
  loading?: boolean;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const recents = [...chats].slice(0, 6);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const pendingDeleteChat = chats.find((c) => c.id === pendingDeleteId) ?? null;

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
          className="ml-auto rounded-md p-1 text-muted hover:bg-foreground/[0.06] hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav buttons — extra gap between New Chat and Recents */}
      <div className="flex flex-col gap-2 p-2">
        <button
          onClick={onNewChat}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg bg-accent px-2.5 py-2 text-[12.5px] font-semibold text-white hover:bg-accent-soft",
            collapsed && "justify-center px-0",
          )}
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && "New Chat"}
        </button>
        <button
          onClick={() => onSelectPanel("chats")}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold hover:bg-foreground/[0.06]",
            activePanel === "chats" ? "bg-accent/10 text-accent" : "text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && "Recents"}
        </button>
      </div>

      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto scroll-thin px-2 pb-2 mt-2">
          <p className="px-1 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted">Recent</p>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted" />
            </div>
          ) : (
            <div className="space-y-0.5">
              {recents.slice(0, 6).map((chat) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  active={chat.id === activeChatId}
                  onClick={() => {
                    onSelectChat(chat.id);
                    onSelectPanel("home");
                  }}
                  onDelete={() => setPendingDeleteId(chat.id)}
                />
              ))}
              {recents.length === 0 && (
                <p className="px-1.5 py-2 text-[11.5px] text-muted">No chats yet — start one above.</p>
              )}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(o) => !o && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteChat ? `"${pendingDeleteChat.title}" and all of its messages will be permanently deleted.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteId) onDeleteChat(pendingDeleteId);
                setPendingDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.aside>
  );
}

function ChatRow({
  chat,
  active,
  onClick,
  onDelete,
}: {
  chat: IntelliChat;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex w-full items-start gap-1 rounded-lg px-1 py-0.5 hover:bg-foreground/[0.06]",
        active && "bg-accent/10",
      )}
    >
      <button onClick={onClick} className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-lg px-1.5 py-1.5 text-left">
        <span className={cn("w-full truncate text-[12.5px] font-semibold", active ? "text-accent" : "text-foreground")}>
          {chat.title}
        </span>
        {chat.preview && <span className="w-full truncate text-[11px] font-semibold text-muted">{chat.preview}</span>}
        <span className="text-[10px] font-semibold text-muted/70">{formatRelativeTime(chat.updatedAtIso)}</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="mt-1.5 shrink-0 rounded-md p-1 text-muted opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
        aria-label={`Delete "${chat.title}"`}
        title="Delete chat"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
