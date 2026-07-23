"use client";

import { useState } from "react";
import { Plus, GitBranch, FolderGit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectGithubDialog } from "@/components/repo/connect-github-dialog";
import type { ConnectedRepository } from "@/lib/repo-types";

export function RepoSidebarSection({
    repositories,
    activeRepoId,
    onSelectRepo,
    onConnectRepo,
    collapsed,
}: {
    repositories: ConnectedRepository[];
    activeRepoId: string | null;
    onSelectRepo: (id: string) => void;
    onConnectRepo: (repo: ConnectedRepository) => void;
    collapsed: boolean;
}) {
    const [dialogOpen, setDialogOpen] = useState(false);

    return (
        <div className="mb-1">
            <div className="flex items-center justify-between px-2.5">
                {!collapsed && (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Repositories</span>
                )}
                <button
                    onClick={() => setDialogOpen(true)}
                    aria-label="Connect repository"
                    className={cn("rounded-md p-1 text-muted hover:bg-black/5 hover:text-foreground", collapsed && "mx-auto")}
                >
                    <Plus className="h-3.5 w-3.5" />
                </button>
            </div>

            <div className="mt-1 space-y-0.5">
                {repositories.map((repo) => {
                    const active = repo.id === activeRepoId;
                    return (
                        <button
                            key={repo.id}
                            onClick={() => onSelectRepo(repo.id)}
                            className={cn(
                                "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium hover:bg-black/5",
                                active ? "bg-accent/10 text-accent" : "text-foreground",
                                collapsed && "justify-center px-0",
                            )}
                            title={repo.fullName}
                        >
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
                            {!collapsed && <span className="truncate">{repo.name}</span>}
                        </button>
                    );
                })}

                {repositories.length === 0 && !collapsed && (
                    <p className="px-2.5 py-1 text-[11.5px] text-muted">No repositories connected yet.</p>
                )}
            </div>

            <ConnectGithubDialog open={dialogOpen} onOpenChange={setDialogOpen} onConnect={onConnectRepo} />
        </div>
    );
}