"use client";

import * as React from "react";
import { Clock, Star, Users, Kanban, GitBranch, Layers3, ChevronRight } from "lucide-react";
import { BoardCapsule } from "@/components/ui/board-capsule";
import { Avatar } from "@/components/ui/avatar";
import { usePrefs } from "@/lib/prefs-context";
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

function PanelShell({ icon: Icon, title, subtitle, children }: { icon: typeof Clock; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="border-b border-border-subtle bg-panel px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" />
          <h1 className="text-[15px] font-semibold text-foreground">{title}</h1>
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
          <span className="truncate text-[13px] font-medium text-foreground">{space.name}</span>
          <BoardCapsule kind={space.kind} />
        </div>
        <p className="truncate text-[11.5px] text-muted">{ws.name}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
    </button>
  );
}

function RepoRow({ repo, onClick }: { repo: ConnectedRepository; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg border border-border-subtle bg-panel px-3 py-2.5 text-left hover:bg-foreground/[0.04]">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${repo.avatarColor}22` }}>
        <GitBranch className="h-3.5 w-3.5" style={{ color: repo.avatarColor }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">{repo.name}</p>
        <p className="truncate text-[11.5px] text-muted">{repo.fullName}</p>
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
  return (
    <PanelShell icon={Users} title="Teams" subtitle="Your workspaces and their spaces">
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
                      className="flex items-center gap-1.5 rounded-full border border-border-subtle px-2.5 py-1 text-[12px] text-foreground hover:bg-foreground/[0.06]"
                    >
                      <Kanban className="h-3 w-3 text-muted" /> {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
