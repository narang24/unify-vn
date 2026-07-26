"use client";

import * as React from "react";
import { Reorder, useDragControls } from "framer-motion";
import { Plus, GitBranch, FolderGit2, GripVertical, Star, MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConnectGithubDialog } from "@/components/repo/connect-github-dialog";
import { useIncidents } from "@/lib/incident-context";
import { usePrefs } from "@/lib/prefs-context";
import type { ConnectedRepository } from "@/lib/repo-types";

export function RepoSidebarSection({
    repositories,
    activeRepoId,
    onSelectRepo,
    onConnectRepo,
    onReorder,
    onDragStateChange,
    collapsed,
}: {
    repositories: ConnectedRepository[];
    activeRepoId: string | null;
    onSelectRepo: (id: string) => void;
    onConnectRepo: (repo: ConnectedRepository) => void;
    onReorder?: (ids: string[]) => void;
    onDragStateChange?: (dragging: boolean) => void;
    collapsed: boolean;
}) {
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const incidents = useIncidents();

    return (
        <div className="mb-1">
            <div className="flex items-center justify-between px-2.5">
                {!collapsed && (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Repositories</span>
                )}
                <button
                    onClick={() => setDialogOpen(true)}
                    aria-label="Connect repository"
                    className={cn("rounded-md p-1 text-muted hover:bg-foreground/6 hover:text-foreground", collapsed && "mx-auto")}
                >
                    <Plus className="h-3.5 w-3.5" />
                </button>
            </div>

            {collapsed ? (
                <div className="mt-1 space-y-0.5">
                    {repositories.map((repo) => (
                        <button
                            key={repo.id}
                            onClick={() => onSelectRepo(repo.id)}
                            className={cn(
                                "relative flex w-full items-center justify-center rounded-lg py-1.5",
                                repo.id === activeRepoId ? "bg-accent/10 text-accent" : "text-foreground hover:bg-foreground/6",
                            )}
                            title={repo.fullName}
                        >
                            <RepoGlyph repo={repo} />
                            {incidents.hasNewRecommendation(repo.id) && (
                                <span className="absolute right-2 top-1 h-1.5 w-1.5 rounded-full bg-danger ring-2 ring-panel" />
                            )}
                        </button>
                    ))}
                </div>
            ) : (
                <Reorder.Group
                    axis="y"
                    values={repositories}
                    onReorder={(next) => onReorder?.(next.map((r) => r.id))}
                    className="mt-1 space-y-0.5"
                >
                    {repositories.map((repo) => (
                        <RepoRow
                            key={repo.id}
                            repo={repo}
                            active={repo.id === activeRepoId}
                            hasRecommendation={incidents.hasNewRecommendation(repo.id)}
                            onSelect={() => onSelectRepo(repo.id)}
                            onDragStart={() => onDragStateChange?.(true)}
                            onDragEnd={() => onDragStateChange?.(false)}
                        />
                    ))}
                    {repositories.length === 0 && (
                        <p className="px-2.5 py-1 text-[11.5px] font-semibold text-muted">No repositories connected yet.</p>
                    )}
                </Reorder.Group>
            )}

            <ConnectGithubDialog open={dialogOpen} onOpenChange={setDialogOpen} onConnect={onConnectRepo} />
        </div>
    );
}

function RepoGlyph({ repo }: { repo: ConnectedRepository }) {
    const owner = repo.owner || repo.fullName.split("/")[0];
    const avatarUrl = repo.provider === "github" 
        ? `https://github.com/${owner}.png?size=40` 
        : `https://avatar.vercel.sh/${owner}`;

    return (
        <img
            src={avatarUrl}
            alt={owner}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full object-cover ring-1 ring-border-subtle/50"
        />
    );
}

function RepoRow({
    repo,
    active,
    hasRecommendation,
    onSelect,
    onDragStart,
    onDragEnd,
}: {
    repo: ConnectedRepository;
    active: boolean;
    hasRecommendation?: boolean;
    onSelect: () => void;
    onDragStart: () => void;
    onDragEnd: () => void;
}) {
    const controls = useDragControls();
    const [armed, setArmed] = React.useState(false);
    const armTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const { isStarred, toggleStar } = usePrefs();
    const starred = isStarred(repo.id);

    return (
        <Reorder.Item value={repo} dragListener={false} dragControls={controls} className="list-none">
            <div
                onMouseEnter={() => (armTimer.current = setTimeout(() => setArmed(true), 5000))}
                onMouseLeave={() => {
                    if (armTimer.current) clearTimeout(armTimer.current);
                    setArmed(false);
                }}
                onPointerUp={onDragEnd}
                onPointerDown={(e) => {
                    if (armed) {
                        onDragStart();
                        controls.start(e);
                    }
                }}
                className={cn("group/tab group flex items-center gap-1 rounded-lg pr-1", armed && "drag-armed")}
            >
                <span
                    onPointerDown={(e) => {
                        onDragStart();
                        controls.start(e);
                    }}
                    className="-ml-1 flex h-4 w-4 shrink-0 cursor-grab items-center justify-center text-muted opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
                    aria-label="Drag to reorder"
                >
                    <GripVertical className="h-3.5 w-3.5" />
                </span>
                <div
                    role="button"
                    tabIndex={0}
                    onClick={onSelect}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelect();
                        }
                    }}
                    className={cn(
                        "group/tab flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-[13px] font-semibold hover:bg-foreground/6",
                        active ? "bg-accent/10 text-accent" : "text-foreground",
                    )}
                    title={repo.fullName}
                >
                    <RepoGlyph repo={repo} />
                    <span className="truncate flex-1">{repo.name}</span>
                    {hasRecommendation && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-danger/12 px-1.5 py-0.5 text-[9.5px] font-semibold text-danger">
                            <span className="h-1.5 w-1.5 rounded-full bg-danger" /> AI
                        </span>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <button
                                onClick={(e) => e.stopPropagation()}
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-transparent opacity-0 transition-opacity hover:bg-foreground/8 group-hover/tab:opacity-100"
                            >
                                <MoreVertical className="h-3.5 w-3.5 text-slate-500" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="min-w-35 p-1">
                            <DropdownMenuItem onClick={() => toggleStar(repo.id)} className="px-2 py-1 text-xs h-auto cursor-pointer">
                                {starred ? "Unstar Repository" : "Star Repository"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem className="px-2 py-1 text-xs h-auto cursor-pointer text-red-600 focus:bg-red-500/10 focus:text-red-600">
                                Delete Repository
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </Reorder.Item>
    );
}
