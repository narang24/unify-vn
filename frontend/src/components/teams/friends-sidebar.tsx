"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, X, Search, Check, Loader2, Inbox, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsList } from "@/components/ui/tabs";
import { AddFriendPanel } from "@/components/teams/add-friend-panel";
import { subscribeRealtime } from "@/lib/realtime";
import { toast } from "@/lib/use-toast";
import * as api from "@/lib/api";
import type { ApiFriend, ApiFriendRequest } from "@/lib/api";

// The WebSocket (see @/lib/realtime) is the primary sync path — this poll is
// just a resilience fallback in case the socket is mid-reconnect, so it can
// run much less often than the old 30s interval.
const POLL_INTERVAL_MS = 60_000;

interface FriendsSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function FriendsSidebar({ open, onClose }: FriendsSidebarProps) {
  const [mainTab, setMainTab] = React.useState<"all" | "requests">("all");
  const [requestsTab, setRequestsTab] = React.useState<"received" | "sent">("received");
  const [search, setSearch] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);

  const [friends, setFriends] = React.useState<ApiFriend[]>([]);
  const [received, setReceived] = React.useState<ApiFriendRequest[]>([]);
  const [sent, setSent] = React.useState<ApiFriendRequest[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [friendsList, requests] = await Promise.all([api.listFriends(), api.listFriendRequests()]);
      setFriends(friendsList);
      setReceived(requests.received);
      setSent(requests.sent);
    } catch {
      // Silent — the sidebar just keeps showing the last-known state until the
      // next successful sync, same tolerance as the notification bell.
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + low-frequency fallback poll while open.
  React.useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [open, load]);

  // Primary sync path — instant updates pushed over the WebSocket for any
  // friend request/accept/decline/cancel/removal touching this user.
  React.useEffect(() => {
    if (!open) return;
    const unsubscribe = subscribeRealtime((event) => {
      switch (event.type) {
        case "friend_request:new": {
          const { request, direction } = event.payload as {
            request: ApiFriendRequest;
            direction: "received" | "sent";
          };
          const setList = direction === "received" ? setReceived : setSent;
          setList((prev) => (prev.some((r) => r.id === request.id) ? prev : [request, ...prev]));
          if (direction === "received") {
            toast({ title: "New friend request", description: request.user.fullName ?? request.user.email });
          }
          break;
        }
        case "friend_request:accepted": {
          const { requestId, friend } = event.payload as { requestId: string; friend: ApiFriend };
          setReceived((prev) => prev.filter((r) => r.id !== requestId));
          setSent((prev) => prev.filter((r) => r.id !== requestId));
          setFriends((prev) => (prev.some((f) => f.friendshipId === friend.friendshipId) ? prev : [friend, ...prev]));
          break;
        }
        case "friend_request:declined": {
          const { requestId, status } = event.payload as { requestId: string; status: "declined" };
          setReceived((prev) => prev.filter((r) => r.id !== requestId));
          setSent((prev) => prev.map((r) => (r.id === requestId ? { ...r, status } : r)));
          break;
        }
        case "friend_request:cancelled": {
          const { requestId } = event.payload as { requestId: string };
          setReceived((prev) => prev.filter((r) => r.id !== requestId));
          setSent((prev) => prev.filter((r) => r.id !== requestId));
          break;
        }
        case "friendship:removed": {
          const { friendshipId } = event.payload as { friendshipId: string };
          setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
          break;
        }
        default:
          break;
      }
    });
    return unsubscribe;
  }, [open]);

  const connectedIds = React.useMemo(() => {
    const ids = new Set<string>();
    friends.forEach((f) => ids.add(f.id));
    received.forEach((r) => ids.add(r.user.id));
    sent.forEach((r) => ids.add(r.user.id));
    return ids;
  }, [friends, received, sent]);

  const filteredFriends = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) => (f.fullName ?? "").toLowerCase().includes(q) || f.email.toLowerCase().includes(q),
    );
  }, [friends, search]);

  async function handleAccept(req: ApiFriendRequest) {
    setBusyId(req.id);
    setReceived((prev) => prev.filter((r) => r.id !== req.id));
    try {
      await api.acceptFriendRequest(req.id);
      setFriends((prev) => [
        { friendshipId: req.id, id: req.user.id, fullName: req.user.fullName, email: req.user.email, avatarUrl: req.user.avatarUrl, since: new Date().toISOString() },
        ...prev,
      ]);
      toast({ title: "Friend added", description: `You and ${req.user.fullName ?? req.user.email} are now friends.`, variant: "success" });
    } catch (err) {
      setReceived((prev) => [req, ...prev]);
      toast({ title: "Couldn't accept request", description: (err as Error).message, variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(req: ApiFriendRequest) {
    setBusyId(req.id);
    setReceived((prev) => prev.filter((r) => r.id !== req.id));
    try {
      await api.declineFriendRequest(req.id);
    } catch (err) {
      setReceived((prev) => [req, ...prev]);
      toast({ title: "Couldn't decline request", description: (err as Error).message, variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancelSent(req: ApiFriendRequest) {
    setBusyId(req.id);
    setSent((prev) => prev.filter((r) => r.id !== req.id));
    try {
      await api.cancelFriendRequest(req.id);
    } catch (err) {
      setSent((prev) => [req, ...prev]);
      toast({ title: "Couldn't remove request", description: (err as Error).message, variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop — dims the page behind both floating panels. Sits at a
                lower z-index than either panel, so neither one is ever dimmed. */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[140] bg-black/20"
              onClick={onClose}
            />

            {/* Invisible click-catcher for the Add Friend panel — closes it on
                an outside click without dimming or blocking the Friends panel
                (which sits above this in the stacking order). */}
            {addOpen && (
              <div
                key="add-catcher"
                className="fixed inset-0 z-[149]"
                onClick={() => setAddOpen(false)}
              />
            )}

            {/* Floating panel — margin on every side, never flush to an edge */}
            <motion.aside
              key="panel"
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
              className="fixed right-3 top-2 bottom-3 z-[150] flex w-[calc(100vw-1.5rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-panel shadow-2xl sm:right-4 sm:top-3 sm:bottom-4"
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 border-b border-border-subtle px-4 py-3.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-700">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <h2 className="flex-1 text-[14px] font-semibold text-foreground">Friends</h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search */}
              <div className="px-3 pt-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                  <Input
                    placeholder="Search friends…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 pl-8 text-[12.5px]"
                  />
                </div>
              </div>

              {/* Segmented controls */}
              <div className="px-3 pt-2.5">
                <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "all" | "requests")}>
                  <TabsList className="border-b-0 gap-1 rounded-lg bg-foreground/[0.04] p-1">
                    <SegmentButton active={mainTab === "all"} onClick={() => setMainTab("all")}>
                      All <CountPill n={friends.length} active={mainTab === "all"} />
                    </SegmentButton>
                    <SegmentButton active={mainTab === "requests"} onClick={() => setMainTab("requests")}>
                      Requests <CountPill n={received.length + sent.length} active={mainTab === "requests"} />
                    </SegmentButton>
                  </TabsList>
                </Tabs>

                {mainTab === "requests" && (
                  <div className="mt-2 flex gap-1 rounded-lg bg-foreground/[0.04] p-1">
                    <SegmentButton small active={requestsTab === "received"} onClick={() => setRequestsTab("received")}>
                      <Inbox className="h-3 w-3" /> Received <CountPill n={received.length} active={requestsTab === "received"} />
                    </SegmentButton>
                    <SegmentButton small active={requestsTab === "sent"} onClick={() => setRequestsTab("sent")}>
                      <Send className="h-3 w-3" /> Sent <CountPill n={sent.length} active={requestsTab === "sent"} />
                    </SegmentButton>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="mt-2 min-h-0 flex-1 overflow-y-auto scroll-thin p-3 pb-20 pt-1">
                {loading && friends.length === 0 && received.length === 0 && sent.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-4 w-4 animate-spin text-muted" />
                  </div>
                ) : mainTab === "all" ? (
                  <FriendsList friends={filteredFriends} search={search} />
                ) : requestsTab === "received" ? (
                  <ReceivedList requests={received} busyId={busyId} onAccept={handleAccept} onDecline={handleDecline} />
                ) : (
                  <SentList requests={sent} busyId={busyId} onCancel={handleCancelSent} />
                )}
              </div>

              {/* Add Friend FAB — fixed to the bottom-right corner of this panel */}
              <button
                onClick={() => setAddOpen((v) => !v)}
                aria-label="Add friend"
                className="absolute bottom-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg hover:bg-teal-800"
              >
                <Plus className="h-5 w-5" />
              </button>
            </motion.aside>

            <AddFriendPanel
              open={addOpen}
              onClose={() => setAddOpen(false)}
              connectedIds={connectedIds}
              onSent={load}
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Small presentational pieces ─────────────────────────────────────────────

function SegmentButton({
  active,
  small,
  onClick,
  children,
}: {
  active: boolean;
  small?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex flex-1 items-center justify-center gap-1 rounded-md font-semibold transition-colors",
        small ? "h-6.5 py-1 text-[11px]" : "h-7 text-[12px]",
        active ? "bg-panel text-foreground shadow-sm" : "text-muted hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function CountPill({ n, active }: { n: number; active: boolean }) {
  if (n === 0) return null;
  return (
    <span
      className={[
        "flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9.5px] font-bold tabular-nums",
        active ? "bg-teal-700 text-white" : "bg-foreground/[0.10] text-muted",
      ].join(" ")}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

function EmptyState({ icon: Icon, label }: { icon: typeof Users; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-10">
      <Icon className="h-5 w-5 text-muted/40" />
      <p className="text-[12px] font-semibold text-muted">{label}</p>
    </div>
  );
}

function FriendsList({ friends, search }: { friends: ApiFriend[]; search: string }) {
  if (friends.length === 0) {
    return <EmptyState icon={Users} label={search ? "No friends match your search." : "No friends yet — add one below."} />;
  }
  return (
    <div className="space-y-1">
      <AnimatePresence initial={false}>
        {friends.map((f) => {
          const name = f.fullName ?? f.email.split("@")[0];
          return (
            <motion.div
              key={f.friendshipId}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-foreground/[0.06]"
            >
              <Avatar name={name} src={f.avatarUrl} size={30} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-foreground">{name}</p>
                <p className="truncate text-[11px] font-semibold text-muted">{f.email}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function ReceivedList({
  requests,
  busyId,
  onAccept,
  onDecline,
}: {
  requests: ApiFriendRequest[];
  busyId: string | null;
  onAccept: (r: ApiFriendRequest) => void;
  onDecline: (r: ApiFriendRequest) => void;
}) {
  if (requests.length === 0) return <EmptyState icon={Inbox} label="No incoming requests." />;
  return (
    <div className="space-y-1">
      <AnimatePresence initial={false}>
        {requests.map((r) => {
          const name = r.user.fullName ?? r.user.email.split("@")[0];
          const busy = busyId === r.id;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-foreground/[0.06]"
            >
              <Avatar name={name} src={r.user.avatarUrl} size={30} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-foreground">{name}</p>
                <p className="truncate text-[11px] font-semibold text-muted">{r.user.email}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onAccept(r)}
                  disabled={busy}
                  aria-label="Accept"
                  className="flex h-6.5 w-6.5 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => onDecline(r)}
                  disabled={busy}
                  aria-label="Decline"
                  className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-muted hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function SentList({
  requests,
  busyId,
  onCancel,
}: {
  requests: ApiFriendRequest[];
  busyId: string | null;
  onCancel: (r: ApiFriendRequest) => void;
}) {
  if (requests.length === 0) return <EmptyState icon={Send} label="No outgoing requests." />;
  return (
    <div className="space-y-1">
      <AnimatePresence initial={false}>
        {requests.map((r) => {
          const name = r.user.fullName ?? r.user.email.split("@")[0];
          const busy = busyId === r.id;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-foreground/[0.06]"
            >
              <Avatar name={name} src={r.user.avatarUrl} size={30} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-foreground">{name}</p>
                <p className="truncate text-[11px] font-semibold text-muted">{r.user.email}</p>
              </div>
              {r.status === "pending" ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  Pending
                </span>
              ) : (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10.5px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  Declined
                </span>
              )}
              <button
                onClick={() => onCancel(r)}
                disabled={busy}
                aria-label={r.status === "pending" ? "Cancel request" : "Dismiss"}
                className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-muted hover:bg-foreground/[0.08] disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
