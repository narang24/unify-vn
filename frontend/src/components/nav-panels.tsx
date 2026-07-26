"use client";

import * as React from "react";
import { Clock, Star, Users, Kanban, GitBranch, Layers3, ChevronRight, Search, Plus } from "lucide-react";
import { BoardCapsule } from "@/components/ui/board-capsule";
import { Avatar } from "@/components/ui/avatar";
import { usePrefs } from "@/lib/prefs-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ShellWorkspace } from "@/components/app-shell";
import type { ConnectedRepository } from "@/lib/repo-types";

interface PanelProps {
  workspaces: ShellWorkspace[];
  repositories: ConnectedRepository[];
  onSelectSpace: (id: string) => void;
  onSelectRepo: (id: string) => void;
}

function findSpace(workspaces: ShellWorkspace[], id: string) {
  for (const ws of workspaces) {
    const space = ws.spaces.find((s) => s.id === id);
    if (space) return { space, workspace: ws };
  }
  return null;
}

function PanelShell({ icon: Icon, title, subtitle, children, rightAction }: { icon: React.ElementType; title: string; subtitle: string; children: React.ReactNode; rightAction?: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="border-b border-border-subtle bg-panel px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-accent" />
            <h1 className="text-[15px] font-semibold text-foreground">{title}</h1>
          </div>
          {rightAction}
        </div>
        <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SpaceRow({ ws, space, onClick }: { ws: ShellWorkspace; space: ShellWorkspace["spaces"][number]; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg border border-border-subtle bg-panel px-3 py-2.5 text-left hover:bg-foreground/[0.04]">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10"><Kanban className="h-3.5 w-3.5 text-accent" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-foreground">{space.name}</span>
          <BoardCapsule kind={space.kind} />
        </div>
        <p className="truncate text-[11.5px] font-semibold text-muted">{ws.name}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
    </button>
  );
}

function RepoRow({ repo, onClick }: { repo: ConnectedRepository; onClick: () => void }) {
  const owner = repo.owner || repo.fullName.split("/")[0];
  const avatarUrl = repo.provider === "github" 
      ? `https://github.com/${owner}.png?size=56` 
      : `https://avatar.vercel.sh/${owner}`;

  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg border border-border-subtle bg-panel px-3 py-2.5 text-left hover:bg-foreground/[0.04]">
      <img
          src={avatarUrl}
          alt={owner}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full object-cover ring-1 ring-border-subtle/50"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{repo.name}</p>
        <p className="truncate text-[11.5px] font-semibold text-muted">{repo.fullName}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-subtle py-10 text-center">
      <p className="text-[12.5px] text-muted">{text}</p>
    </div>
  );
}

export function RecentsPanel({ workspaces, repositories, onSelectSpace, onSelectRepo }: PanelProps) {
  const { recents } = usePrefs();
  const items = recents
    .map((r) => {
      if (r.type === "space") {
        const found = findSpace(workspaces, r.id);
        return found ? { key: r.id, node: <SpaceRow key={r.id} ws={found.workspace} space={found.space} onClick={() => onSelectSpace(r.id)} /> } : null;
      }
      const repo = repositories.find((x) => x.id === r.id);
      return repo ? { key: r.id, node: <RepoRow key={r.id} repo={repo} onClick={() => onSelectRepo(r.id)} /> } : null;
    })
    .filter(Boolean) as { key: string; node: React.ReactNode }[];

  return (
    <PanelShell icon={Clock} title="Recent" subtitle="Spaces and repositories you opened recently">
      {items.length ? <div className="space-y-1.5">{items.map((i) => i.node)}</div> : <EmptyState text="Nothing here yet — open a space or repository." />}
    </PanelShell>
  );
}

export function StarredPanel({ workspaces, repositories, onSelectSpace, onSelectRepo }: PanelProps) {
  const { starred } = usePrefs();
  const spaceNodes: React.ReactNode[] = [];
  const repoNodes: React.ReactNode[] = [];
  workspaces.forEach((ws) => ws.spaces.forEach((s) => { if (starred.has(s.id)) spaceNodes.push(<SpaceRow key={s.id} ws={ws} space={s} onClick={() => onSelectSpace(s.id)} />); }));
  repositories.forEach((r) => { if (starred.has(r.id)) repoNodes.push(<RepoRow key={r.id} repo={r} onClick={() => onSelectRepo(r.id)} />); });

  return (
    <PanelShell icon={Star} title="Starred" subtitle="Your starred spaces and repositories">
      {spaceNodes.length + repoNodes.length === 0 ? (
        <EmptyState text="Star a space or repository (hover it in the sidebar) to pin it here." />
      ) : (
        <div className="space-y-4">
          {spaceNodes.length > 0 && <div className="space-y-1.5">{spaceNodes}</div>}
          {repoNodes.length > 0 && <div className="space-y-1.5">{repoNodes}</div>}
        </div>
      )}
    </PanelShell>
  );
}

export function TeamsPanel({ workspaces, onSelectSpace, currentUser }: PanelProps & { currentUser: string }) {
  const [modalOpen, setModalOpen] = React.useState(false);
  
  return (
    <>
      <PanelShell 
        icon={Users} 
        title="Teams" 
        subtitle="Your workspaces and their spaces"
        rightAction={
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] gap-1.5 rounded-lg border-border-subtle shadow-sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-3 w-3" /> Create Team
          </Button>
        }
      >
        {workspaces.length === 0 ? (
          <EmptyState text="No teams yet — create a workspace to get started." />
        ) : (
          <div className="space-y-3">
            {workspaces.map((ws) => (
              <div key={ws.id} className="rounded-xl border border-border-subtle bg-panel p-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10"><Layers3 className="h-4 w-4 text-accent" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-foreground">{ws.name}</p>
                    <p className="text-[11.5px] text-muted">{ws.spaces.length} space{ws.spaces.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center"><Avatar name={currentUser} size={24} /></div>
                </div>
                {ws.spaces.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {ws.spaces.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => onSelectSpace(s.id)}
                        className="rounded-md border border-border-subtle bg-background px-2.5 py-1 text-[11.5px] font-medium text-foreground transition-colors hover:bg-foreground/[0.04]"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </PanelShell>
      <CreateTeamModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

function CreateTeamModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [tab, setTab] = React.useState("add");
  const [search, setSearch] = React.useState("");
  
  // Dummy data
  const existingMembers = [
    { name: "Alice Smith", email: "alice@example.com" },
    { name: "Bob Jones", email: "bob@example.com" },
    { name: "Charlie Brown", email: "charlie@example.com" },
  ];
  
  const pastInvites = [
    { email: "dave@example.com", status: "Pending" },
    { email: "eve@example.com", status: "Accepted" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] p-6 rounded-[24px]">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Create Team</DialogTitle>
        </DialogHeader>

        {/* Compact Search Bar */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input 
            placeholder="Search people or emails..." 
            className="pl-9 h-9 text-[13px] bg-background border-border-subtle rounded-xl shadow-sm focus-visible:ring-accent/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full flex h-10 p-1 bg-background border border-border-subtle rounded-xl mb-5">
            <TabsTrigger value="add" className="flex-1 text-[12px] font-semibold rounded-lg h-8 data-[state=active]:bg-panel data-[state=active]:shadow-sm data-[state=active]:border-transparent border border-transparent">
              Add Member
            </TabsTrigger>
            <TabsTrigger value="invite" className="flex-1 text-[12px] font-semibold rounded-lg h-8 data-[state=active]:bg-panel data-[state=active]:shadow-sm data-[state=active]:border-transparent border border-transparent">
              Invite Member
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-2 mt-0 h-[220px] overflow-y-auto pr-1 scroll-thin">
            {existingMembers.map((m) => (
              <div key={m.email} className="flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-border-subtle hover:bg-background transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} size={34} />
                  <div>
                    <p className="text-[13.5px] font-semibold text-foreground leading-tight">{m.name}</p>
                    <p className="text-[11.5px] text-muted">{m.email}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-lg px-3.5 font-bold border-border-subtle hover:bg-accent hover:text-white hover:border-accent transition-colors shadow-sm">
                  Add
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="invite" className="flex flex-col mt-0 h-[220px] overflow-y-auto pr-1 scroll-thin">
            <div className="flex gap-2 mb-6">
              <Input placeholder="name@example.com" className="h-9 text-[13px] bg-background border-border-subtle rounded-xl shadow-sm flex-1" />
              <Button size="sm" className="h-9 text-[12px] font-bold bg-accent hover:bg-accent-strong text-white px-5 rounded-xl shadow-sm">
                Invite
              </Button>
            </div>
            
            <div className="flex flex-col flex-1">
              <p className="text-[10.5px] font-bold tracking-widest uppercase text-muted mb-3 px-1">Past Invites</p>
              <div className="space-y-2">
                {pastInvites.map((inv) => (
                  <div key={inv.email} className="flex items-center justify-between py-2 px-3 rounded-xl bg-background border border-border-subtle shadow-sm">
                    <span className="text-[12.5px] text-foreground font-medium">{inv.email}</span>
                    <span className={`text-[10.5px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-md ${inv.status === 'Pending' ? 'bg-orange-500/10 text-orange-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
