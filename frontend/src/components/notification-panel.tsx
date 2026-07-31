"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  AlertTriangle,
  BotMessageSquare,
  CheckCircle2,
  Kanban,
  ArrowRight,
  UserPlus,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as api from "@/lib/api";
import type { ApiNotification } from "@/lib/api";
import { toast } from "@/lib/use-toast";

const POLL_INTERVAL_MS = 30_000;

function iconFor(type: string) {
  const cls = "h-3.5 w-3.5 text-[#0c8f8f]";
  switch (type) {
    case "deployment_failed":
      return <AlertTriangle className={cls} />;
    case "ai_insight":
      return <BotMessageSquare className={cls} />;
    case "task_assigned":
      return <Kanban className={cls} />;
    case "task_completed":
      return <CheckCircle2 className={cls} />;
    case "added_to_team":
    case "team_invite":
      return <UserPlus className={cls} />;
    default:
      return <Bell className={cls} />;
  }
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

interface NotificationPanelProps {
  onSelectSpace?: (id: string) => void;
}

export function NotificationPanel({ onSelectSpace }: NotificationPanelProps) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<ApiNotification[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [markingAll, setMarkingAll] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((n) => !n.read).length;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { notifications } = await api.listNotifications();
      setItems(notifications);
    } catch {
      // Silently ignore — the bell just shows no notifications until it can reach the API.
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSelect(notif: ApiNotification) {
    if (!notif.read) {
      setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
      try {
        await api.markNotificationRead(notif.id);
      } catch {
        setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: false } : n)));
      }
    }
    if (notif.entityType === "space" && notif.entityId) {
      onSelectSpace?.(notif.entityId);
      setOpen(false);
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    const prevItems = items;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.markAllNotificationsRead();
    } catch (err) {
      setItems(prevItems);
      toast({ title: "Couldn't mark all as read", description: (err as Error).message, variant: "error" });
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Bell trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex h-8 items-center gap-1.5 rounded-lg px-2 text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground",
          open && "bg-foreground/[0.06] text-foreground",
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#0c8f8f] px-1.5 text-[10px] font-bold text-white text-center tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[calc(100vw-2rem)] max-w-[360px] overflow-hidden rounded-xl border border-border-subtle bg-panel shadow-[0_20px_40px_rgba(4,25,28,0.18)] sm:w-[360px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border-subtle">
              <span className="text-[12.5px] font-bold text-foreground">Notifications</span>
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll || unreadCount === 0}
                className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-[#0c8f8f] bg-[#0c8f8f]/[0.08] transition-colors hover:bg-[#0c8f8f]/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {markingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                Mark all read
              </button>
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto scroll-thin">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-4 w-4 animate-spin text-muted" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1.5 py-10">
                  <Bell className="h-5 w-5 text-muted/40" />
                  <p className="text-[12px] font-semibold text-muted">All caught up!</p>
                </div>
              ) : (
                items.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleSelect(notif)}
                    className={cn(
                      "group flex w-full items-center gap-2.5 border-b border-border-subtle pl-2.5 pr-3 py-2 text-left last:border-0 transition-colors hover:bg-foreground/[0.03]",
                      !notif.read && "bg-[#0c8f8f]/[0.04]",
                    )}
                  >
                    {/* Dot + Icon (vertically centered) */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {!notif.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0c8f8f]" />}
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#0c8f8f]/[0.10]">
                        {iconFor(notif.type)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <p className="truncate text-[12.5px] font-semibold text-foreground">{notif.title}</p>
                      {notif.body && (
                        <p className="mt-[1px] truncate text-[11.5px] font-semibold leading-snug text-muted">
                          {notif.body}
                        </p>
                      )}
                    </div>

                    {/* Right side: Actions top, Time bottom */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {notif.entityType === "space" && notif.entityId && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-foreground/[0.06] text-muted transition-colors group-hover:bg-[#0c8f8f] group-hover:text-white">
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      )}
                      <span className="pr-0.5 text-[10.5px] font-semibold text-muted/60 whitespace-nowrap">
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
