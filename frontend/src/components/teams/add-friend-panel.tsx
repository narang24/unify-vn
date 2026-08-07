"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Search, X, Check, Clock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import * as api from "@/lib/api";
import type { ApiUserSearchResult } from "@/lib/api";

interface AddFriendPanelProps {
  open: boolean;
  onClose: () => void;
  /** user ids that are already friends or have a pending request either way */
  connectedIds: Set<string>;
  onSent: () => void;
}

// A compact floating sheet that docks immediately to the left of the Friends
// sidebar (see friends-sidebar.tsx), aligned toward its lower portion so it
// reads as a natural extension of that panel rather than a separate modal.
// On mobile there's no room beside the Friends panel, so it docks to the
// same bottom edge instead, layered above it — both panels stay independently
// interactive either way; there's no dimming backdrop over the Friends panel.
export function AddFriendPanel({ open, onClose, connectedIds, onSent }: AddFriendPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiUserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setQuery("");
      setResults([]);
      setSentIds(new Set());
      setError("");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      api
        .searchUsers(q)
        .then(setResults)
        .catch(() => setError("Couldn't search users."))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function handleAdd(userId: string) {
    setSendingId(userId);
    setError("");
    try {
      await api.sendFriendRequest(userId);
      setSentIds((prev) => new Set(prev).add(userId));
      onSent();
    } catch {
      setError("Couldn't send friend request.");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="add-friend-panel"
          initial={{ x: 16, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 16, opacity: 0 }}
          transition={{ type: "tween", duration: 0.18, ease: "easeOut" }}
          className="fixed z-[155] left-3 right-3 bottom-3 sm:left-auto sm:right-[408px] sm:bottom-4 sm:w-[312px] flex max-h-[65vh] sm:max-h-[460px] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-panel shadow-2xl"
        >
          {/* Compact header */}
          <div className="flex items-center gap-2.5 border-b border-border-subtle px-3.5 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-700">
              <UserPlus className="h-3.5 w-3.5 text-white" />
            </div>
            <h2 className="flex-1 text-[13.5px] font-semibold text-foreground">Add Friend</h2>
            <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted hover:bg-foreground/[0.06]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Search row */}
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <Input
                autoFocus
                placeholder="Search people…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8.5 pl-8 text-[12.5px]"
              />
              {searching && (
                <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted" />
              )}
            </div>
            {error && <p className="mt-1.5 text-[11px] text-red-500">{error}</p>}
          </div>

          {/* Results */}
          <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto scroll-thin px-2.5 pb-3">
            {!query.trim() ? (
              <p className="py-5 text-center text-[11.5px] font-semibold text-muted">Start typing to find people.</p>
            ) : !searching && results.length === 0 ? (
              <p className="py-5 text-center text-[11.5px] font-semibold text-muted">No one found.</p>
            ) : (
              <AnimatePresence initial={false}>
                {results.map((u) => {
                  const name = u.fullName ?? u.email.split("@")[0];
                  const alreadyConnected = connectedIds.has(u.id);
                  const justSent = sentIds.has(u.id);
                  return (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-foreground/[0.06]"
                    >
                      <Avatar name={name} src={u.avatarUrl} size={28} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-foreground truncate">{name}</p>
                        <p className="text-[11px] font-semibold text-muted truncate">{u.email}</p>
                      </div>

                      {alreadyConnected || justSent ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                          {justSent ? <Clock className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                          {justSent ? "Sent" : "Connected"}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAdd(u.id)}
                          disabled={sendingId === u.id}
                          className="flex h-7 items-center gap-1 rounded-md bg-teal-700 px-2.5 text-[10.5px] font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                        >
                          {sendingId === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                          Add
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
