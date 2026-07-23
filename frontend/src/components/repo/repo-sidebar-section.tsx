"use client";

import * as React from "react";
import { Reorder, useDragControls } from "framer-motion";
import { Plus, GitBranch, FolderGit2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectGithubDialog } from "@/components/repo/connect-github-dialog";
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

    return (
        <div className="mb-1">
            <div className="flex items-center justify-between px-2.5">
                {!collapsed && (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Repositories</span>
                )}
                <button
                    onClick={() => setDialogOpen(true)}
                    aria-label="Connect repository"
                    className={cn("rounded-md p-1 text-muted hover:bg-foreground/[0.06] hover:text-foreground", collapsed && "mx-auto")}
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
                                "flex w-full items-center justify-center rounded-lg py-1.5",
                                repo.id === activeRepoId ? "bg-accent/10 text-accent" : "text-foreground hover:bg-foreground/[0.06]",
                            )}
                            title={repo.fullName}
                        >
                            <RepoGlyph repo={repo} />
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
                            onSelect={() => onSelectRepo(repo.id)}
                            onDragStart={() => onDragStateChange?.(true)}
                            onDragEnd={() => onDragStateChange?.(false)}
                        />
                    ))}
                    {repositories.length === 0 && (
                        <p className="px-2.5 py-1 text-[11.5px] text-muted">No repositories connected yet.</p>
                    )}
                </Reorder.Group>
            )}

            <ConnectGithubDialog open={dialogOpen} onOpenChange={setDialogOpen} onConnect={onConnectRepo} />
        </div>
    );
}

function RepoGlyph({ repo }: { repo: ConnectedRepository }) {
    return (
        <span
            className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded"
            style={{ backgroundColor: `${repo.avatarColor}22` }}
        >
            {repo.provider === "github" ? (
                <GitBranch className="h-3 w-3" style={{ color: repo.avatarColor }} />
            ) : (
                <FolderGit2 className="h-3 w-3" style={{ color: repo.avatarColor }} />
            )}
        </span>
    );
}

function RepoRow({
    repo,
    active,
    onSelect,
    onDragStart,
    onDragEnd,
}: {
    repo: ConnectedRepository;
    active: boolean;
    onSelect: () => void;
    onDragStart: () => void;
    onDragEnd: () => void;
}) {
    const controls = useDragControls();
    const [armed, setArmed] = React.useState(false);
    const armTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    return (
        <Reorder.Item value={repo} dragListener={false} dragControls={controls} className="list-none">
            <div
                onMouseEnter={() => (armTimer.current = setTimeout(() => setArmed(true), 1200))}
                onMouseLeave={() => {
                    if (armTimer.current) clearTimeout(armTimer.current);
                    setArmed(false);
                }}
                className={cn("group flex items-center gap-1 rounded-lg", armed && "drag-armed")}
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
                <button
                    onClick={onSelect}
                    onPointerUp={onDragEnd}
                    className={cn(
                        "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-[13px] font-medium hover:bg-foreground/[0.06]",
                        active ? "bg-accent/10 text-accent" : "text-foreground",
                    )}
                    title={repo.fullName}
                >
                    <RepoGlyph repo={repo} />
                    <span className="truncate">{repo.name}</span>
                </button>
            </div>
        </Reorder.Item>
    );
}
