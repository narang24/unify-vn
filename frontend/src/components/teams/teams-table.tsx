"use client";

import * as React from "react";
import {
  Star,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  Check,
  X,
  Users as UsersIcon,
  Plus,
  Loader2,
} from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { AddMemberPopover } from "@/components/teams/add-member-popover";
import { toast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import * as api from "@/lib/api";
import type { ApiTeam } from "@/lib/api";

const MAX_AVATARS = 4;
const MAX_SPACE_BADGES = 3;

interface TeamsTableProps {
  currentUser?: { fullName?: string | null; email: string } | null;
}

export function TeamsTable({ currentUser }: TeamsTableProps) {
  const [teams, setTeams] = React.useState<ApiTeam[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ApiTeam | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [newName, setNewName] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [showCreateRow, setShowCreateRow] = React.useState(false);
  const newNameInputRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    try {
      const list = await api.listTeams();
      setTeams(list);
    } catch (err) {
      toast({ title: "Couldn't load teams", description: (err as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function startEdit(team: ApiTeam) {
    setEditingId(team.id);
    setEditName(team.name);
    setEditDescription(team.description ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  }

  async function saveEdit(team: ApiTeam) {
    if (!editName.trim()) {
      toast({ title: "Team name is required", variant: "error" });
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await api.updateTeam(team.id, { name: editName.trim(), description: editDescription.trim() || null });
      setTeams((prev) => prev.map((t) => (t.id === team.id ? updated : t)));
      toast({ title: "Team updated", variant: "success" });
      cancelEdit();
    } catch (err) {
      toast({ title: "Couldn't update team", description: (err as Error).message, variant: "error" });
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDuplicate(team: ApiTeam) {
    try {
      const duplicate = await api.duplicateTeam(team.id);
      setTeams((prev) => [duplicate, ...prev]);
      toast({ title: "Team duplicated", description: `"${duplicate.name}" was created.`, variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't duplicate team", description: (err as Error).message, variant: "error" });
    }
  }

  async function handleToggleStar(team: ApiTeam) {
    setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, starred: !t.starred } : t)));
    try {
      const starred = await api.starTeam(team.id);
      setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, starred } : t)));
    } catch (err) {
      setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, starred: team.starred } : t)));
      toast({ title: "Couldn't update star", description: (err as Error).message, variant: "error" });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteTeam(deleteTarget.id);
      setTeams((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast({ title: "Team deleted", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't delete team", description: (err as Error).message, variant: "error" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) {
      toast({ title: "Team name is required", variant: "error" });
      return;
    }
    setCreating(true);
    try {
      const created = await api.createTeam({ name: newName.trim(), description: newDescription.trim() || undefined });
      setTeams((prev) => [created, ...prev]);
      setNewName("");
      setNewDescription("");
      setShowCreateRow(false);
      toast({ title: "Team created", description: `"${created.name}" is ready.`, variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't create team", description: (err as Error).message, variant: "error" });
    } finally {
      setCreating(false);
    }
  }

  function openCreateRow() {
    setShowCreateRow(true);
    // Focus the name input once the row has rendered.
    requestAnimationFrame(() => newNameInputRef.current?.focus());
  }

  function cancelCreateRow() {
    setShowCreateRow(false);
    setNewName("");
    setNewDescription("");
  }

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="border-b border-border-subtle bg-panel px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-accent" />
            <h1 className="text-[15px] font-semibold text-foreground">Teams</h1>
          </div>
        </div>
        <p className="mt-0.5 text-[12px] text-muted">Manage the teams you own or belong to</p>
      </div>

      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] text-muted">{teams.length} team{teams.length === 1 ? "" : "s"}</p>
        </div>

        <div className="overflow-hidden rounded-md border border-border-subtle bg-panel">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[26%]">Team Name</TableHead>
                <TableHead className="w-[22%]">Team Members</TableHead>
                <TableHead className="w-[16%]">Team Owner</TableHead>
                <TableHead className="w-[24%]">Related Spaces</TableHead>
                <TableHead className="w-[12%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-[12.5px] text-muted">
                    No teams yet — create one below.
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => {
                  const isEditing = editingId === team.id;
                  const memberIds = team.members.filter((m) => m.userId).map((m) => m.userId as string);
                  return (
                    <TableRow key={team.id}>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-7 rounded-sm text-[12.5px]"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleStar(team)}
                              aria-label={team.starred ? "Unstar team" : "Star team"}
                              className="shrink-0 text-muted hover:text-amber-500"
                            >
                              <Star className={cn("h-3.5 w-3.5", team.starred && "fill-amber-400 text-amber-400")} />
                            </button>
                            <span className="truncate text-[13px] font-semibold text-foreground">{team.name}</span>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Description (optional)"
                            className="h-7 rounded-sm text-[12px]"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="flex -space-x-1.5">
                              {team.avatars.slice(0, MAX_AVATARS).map((a, i) => (
                                <Avatar
                                  key={a.userId ?? i}
                                  name={a.fullName ?? "?"}
                                  src={a.avatarUrl}
                                  size={22}
                                  className="ring-2 ring-panel"
                                />
                              ))}
                              {team.memberCount > MAX_AVATARS && (
                                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-foreground/[0.08] text-[9.5px] font-bold text-muted ring-2 ring-panel">
                                  +{team.memberCount - MAX_AVATARS}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted">{team.memberCount}</span>
                            <AddMemberPopover teamId={team.id} existingUserIds={memberIds} onAdded={load} />
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Avatar name={team.owner?.fullName ?? team.owner?.email} src={team.owner?.avatarUrl} size={22} />
                          <span className="truncate text-[12px] font-medium text-foreground">
                            {team.owner?.fullName ?? team.owner?.email ?? "—"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          {team.relatedSpaces.length === 0 ? (
                            <span className="text-[11.5px] text-muted">No spaces</span>
                          ) : (
                            <>
                              {team.relatedSpaces.slice(0, MAX_SPACE_BADGES).map((s) => (
                                <Badge key={s.id} variant="muted" className="rounded-md text-[10.5px] font-medium">
                                  {s.name}
                                </Badge>
                              ))}
                              {team.relatedSpaces.length > MAX_SPACE_BADGES && (
                                <Badge variant="muted" className="rounded-md text-[10.5px] font-medium">
                                  +{team.relatedSpaces.length - MAX_SPACE_BADGES} more
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => saveEdit(team)}
                              disabled={savingEdit}
                              aria-label="Save"
                              className="flex h-6 w-6 items-center justify-center rounded-md text-success hover:bg-success/10"
                            >
                              {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={cancelEdit}
                              aria-label="Cancel"
                              className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-foreground/[0.08]"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger>
                                <button
                                  aria-label="Team actions"
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-foreground/[0.08] hover:text-foreground"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => startEdit(team)}>
                                  <Pencil className="h-3.5 w-3.5" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(team)}>
                                  <Copy className="h-3.5 w-3.5" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStar(team)}>
                                  <Star className="h-3.5 w-3.5" /> {team.starred ? "Unstar" : "Star"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem destructive onClick={() => setDeleteTarget(team)}>
                                  <Trash2 className="h-3.5 w-3.5" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}

              {!showCreateRow && (
                <TableRow className="hover:bg-foreground/[0.04]">
                  <TableCell colSpan={5} className="p-0">
                    <button
                      onClick={openCreateRow}
                      className="flex h-9 w-full items-center gap-1.5 bg-foreground/[0.03] px-3 text-left text-[12.5px] font-medium text-muted hover:bg-foreground/[0.06] hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create
                    </button>
                  </TableCell>
                </TableRow>
              )}

              {showCreateRow ? (
                <TableRow className="bg-foreground/[0.02] hover:bg-foreground/[0.02]">
                  <TableCell>
                    <Input
                      ref={newNameInputRef}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Team name"
                      className="h-7 rounded-sm text-[12.5px]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreate();
                        if (e.key === "Escape") cancelCreateRow();
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
                      <UsersIcon className="h-3.5 w-3.5" />
                      Add after creating
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Avatar name={currentUser?.fullName ?? currentUser?.email} size={22} />
                      <span className="truncate text-[12px] font-medium text-foreground">
                        {currentUser?.fullName ?? currentUser?.email ?? "You"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Description (optional)"
                      className="h-7 rounded-sm text-[12px]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreate();
                        if (e.key === "Escape") cancelCreateRow();
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        onClick={handleCreate}
                        disabled={creating}
                        className="h-7 rounded-sm bg-teal-800 px-3 text-[11.5px] font-semibold text-white hover:bg-teal-900"
                      >
                        {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
                      </Button>
                      <button
                        onClick={cancelCreateRow}
                        aria-label="Cancel"
                        className="flex h-7 w-7 items-center justify-center rounded-sm text-muted hover:bg-foreground/[0.08]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}" and remove all its members. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
