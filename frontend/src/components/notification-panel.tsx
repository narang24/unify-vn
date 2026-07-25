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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationKind =
  | "deployment_failed"
  | "ai_insight"
  | "task_assigned"
  | "task_completed"
  | "mention";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  spaceName?: string;
  spaceId?: string;
  timestamp: string;
  read?: boolean;
  onNavigate?: () => void;
}

// ─── Icon ─────────────────────────────────────────────────────────────────────

function NotifIcon({ kind }: { kind: NotificationKind }) {
  const cls = "h-3.5 w-3.5 text-[#0c8f8f]";
  switch (kind) {
    case "deployment_failed": return <AlertTriangle className={cls} />;
    case "ai_insight":        return <BotMessageSquare className={cls} />;
    case "task_assigned":     return <Kanban className={cls} />;
    case "task_completed":    return <CheckCircle2 className={cls} />;
    case "mention":           return <Bell className={cls} />;
    default:                  return <Bell className={cls} />;
  }
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    kind: "deployment_failed",
    title: "Deployment Failed",
    body: "Production deploy #47 failed on build step.",
    spaceName: "Dev Ops",
    timestamp: "2m ago",
    read: false,
  },
  {
    id: "n2",
    kind: "ai_insight",
    title: "AI Investigation Complete",
    body: "Unify Intelli found 3 bottlenecks in your sprint.",
    spaceName: "My Space",
    timestamp: "15m ago",
    read: false,
  },
  {
    id: "n3",
    kind: "task_assigned",
    title: "Task Assigned to You",
    body: "\"Fix auth callback redirect\" was assigned to you.",
    spaceName: "My Space",
    timestamp: "1h ago",
    read: false,
  },
  {
    id: "n4",
    kind: "task_completed",
    title: "Task Completed",
    body: "\"Set up CI pipeline\" was marked complete by Rohan.",
    spaceName: "Dev Ops",
    timestamp: "3h ago",
    read: true,
  },
  {
    id: "n5",
    kind: "mention",
    title: "You were mentioned",
    body: "@rajni check the backlog before standup.",
    spaceName: "My Space",
    timestamp: "Yesterday",
    read: true,
  },
];

// ─── Panel ────────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  notifications?: AppNotification[];
  onSelectSpace?: (id: string) => void;
}

export function NotificationPanel({
  notifications = DEMO_NOTIFICATIONS,
  onSelectSpace,
}: NotificationPanelProps) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState(notifications);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((n) => !n.read).length;

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function dismiss(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
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
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[360px] overflow-hidden rounded-xl border border-border-subtle bg-panel shadow-[0_20px_40px_rgba(4,25,28,0.18)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border-subtle">
              <span className="text-[12.5px] font-bold text-foreground">Notifications</span>
              <button
                onClick={() => {
                  setOpen(false);
                  // TODO: Implement full notifications page navigation
                }}
                className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-[#0c8f8f] bg-[#0c8f8f]/[0.08] hover:bg-[#0c8f8f]/[0.14] transition-colors"
              >
                See All
              </button>
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto scroll-thin">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1.5 py-10">
                  <Bell className="h-5 w-5 text-muted/40" />
                  <p className="text-[12px] font-semibold text-muted">All caught up!</p>
                </div>
              ) : (
                items.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      "group flex items-center gap-2.5 border-b border-border-subtle pl-2.5 pr-3 py-2 last:border-0 transition-colors hover:bg-foreground/[0.03]",
                      !notif.read && "bg-[#0c8f8f]/[0.04]",
                    )}
                  >
                    {/* Dot + Icon (vertically centered) */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {!notif.read && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0c8f8f]" />
                      )}
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#0c8f8f]/[0.10]">
                        <NotifIcon kind={notif.kind} />
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <p className="truncate text-[12.5px] font-semibold text-foreground">
                        {notif.title}
                      </p>
                      <p className="mt-[1px] truncate text-[11.5px] font-semibold leading-snug text-muted">
                        {notif.body}
                      </p>
                    </div>

                    {/* Right side: Actions top, Time bottom */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="flex items-center gap-0.5">
                        {(notif.spaceId || notif.onNavigate) && (
                          <button
                            onClick={() => {
                              if (notif.onNavigate) notif.onNavigate();
                              else if (notif.spaceId) onSelectSpace?.(notif.spaceId);
                              setOpen(false);
                            }}
                            className="flex h-5 w-5 items-center justify-center rounded-md bg-foreground/[0.06] text-muted transition-colors hover:bg-[#0c8f8f] hover:text-white"
                            aria-label="Go to space"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={() => dismiss(notif.id)}
                          className="flex h-5 w-5 items-center justify-center rounded-md text-muted opacity-0 transition-all hover:bg-foreground/[0.06] hover:text-foreground group-hover:opacity-100"
                          aria-label="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="pr-0.5 text-[10.5px] font-semibold text-muted/60 whitespace-nowrap">
                        {notif.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
