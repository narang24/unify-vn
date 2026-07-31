"use client";

import * as React from "react";
import { UserPlus, Search, Loader2, Mail } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/lib/use-toast";
import * as api from "@/lib/api";
import type { ApiUserSearchResult } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AddMemberPopover({
  teamId,
  existingUserIds,
  onAdded,
  trigger,
}: {
  teamId: string;
  existingUserIds: string[];
  onAdded: () => void;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<ApiUserSearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [inviting, setInviting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      api
        .searchUsers(q)
        .then((users) => setResults(users))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, open]);

  async function handleAddExisting(user: ApiUserSearchResult) {
    setBusyId(user.id);
    try {
      await api.addTeamMember(teamId, user.id);
      toast({ title: "Added to team", description: `${user.fullName ?? user.email} is now a member.`, variant: "success" });
      setResults((prev) => prev.filter((u) => u.id !== user.id));
      onAdded();
    } catch (err) {
      toast({ title: "Couldn't add member", description: (err as Error).message, variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleInvite(email: string) {
    setInviting(true);
    try {
      await api.inviteTeamMemberByEmail(teamId, email);
      toast({ title: "Invitation sent", description: `An invite email was sent to ${email}.`, variant: "success" });
      setQuery("");
      setOpen(false);
      onAdded();
    } catch (err) {
      toast({ title: "Couldn't send invitation", description: (err as Error).message, variant: "error" });
    } finally {
      setInviting(false);
    }
  }

  const trimmed = query.trim();
  const looksLikeEmail = EMAIL_RE.test(trimmed);
  const noMatches = !loading && trimmed.length > 0 && results.length === 0;
  const visibleResults = results.filter((u) => !existingUserIds.includes(u.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        {trigger ?? (
          <button
            type="button"
            aria-label="Add member"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
          >
            <UserPlus className="h-3.5 w-3.5" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input
            autoFocus
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 rounded-lg pl-8 text-[12.5px]"
          />
        </div>

        <div className="max-h-56 overflow-y-auto scroll-thin">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted" />
            </div>
          )}

          {!loading && trimmed.length === 0 && (
            <p className="px-1 py-3 text-center text-[11.5px] text-muted">Start typing to find people.</p>
          )}

          {!loading &&
            visibleResults.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5 hover:bg-foreground/[0.04]">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar name={u.fullName ?? u.email} src={u.avatarUrl} size={26} />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold text-foreground">{u.fullName ?? u.email}</p>
                    <p className="truncate text-[11px] text-muted">{u.email}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 shrink-0 rounded-md px-2 text-[11px]"
                  disabled={busyId === u.id}
                  onClick={() => handleAddExisting(u)}
                >
                  {busyId === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                </Button>
              </div>
            ))}

          {noMatches && looksLikeEmail && (
            <button
              onClick={() => handleInvite(trimmed)}
              disabled={inviting}
              className="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-border-subtle px-2 py-2 text-left text-[12.5px] font-semibold text-accent hover:bg-accent/5"
            >
              {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Invite {trimmed}
            </button>
          )}

          {noMatches && !looksLikeEmail && (
            <p className="px-1 py-3 text-center text-[11.5px] text-muted">No users found.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
