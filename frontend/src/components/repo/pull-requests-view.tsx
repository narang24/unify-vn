"use client";

import { motion } from "framer-motion";
import { GitPullRequest, GitMerge, XCircle, MessageSquare } from "lucide-react";
import { SEED_PULL_REQUESTS } from "@/lib/repo-types";
import type { ContextChip } from "@/lib/repo-types";

const STATE_ICON = {
    open: { icon: GitPullRequest, color: "text-emerald-500" },
    merged: { icon: GitMerge, color: "text-purple-500" },
    closed: { icon: XCircle, color: "text-red-500" },
};

export function PullRequestsView({
    selectMode,
    selectedChips,
    onAddChip,
    onRemoveChip,
}: {
    selectMode: boolean;
    selectedChips: ContextChip[];
    onAddChip: (chip: ContextChip) => void;
    onRemoveChip: (id: string) => void;
}) {
    const selectedIds = new Set(selectedChips.filter((c) => c.type === "pr").map((c) => c.meta));

    return (
        <div className="h-full overflow-y-auto scroll-thin p-4">
            <p className="mb-3 text-[12px] text-muted">
                Fetched from GitHub for this repository. <span className="opacity-70">(mock data — live sync pending)</span>
            </p>
            <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-panel">
                {SEED_PULL_REQUESTS.map((pr, i) => {
                    const { icon: Icon, color } = STATE_ICON[pr.state];
                    const checked = selectedIds.has(pr.id);
                    return (
                        <motion.div
                            key={pr.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-start gap-3 px-3.5 py-3"
                        >
                            {selectMode && (
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                        checked
                                            ? onRemoveChip(`ctx_pr_${pr.id}`)
                                            : onAddChip({ id: `ctx_pr_${pr.id}`, type: "pr", label: `#${pr.number} ${pr.title}`, meta: pr.id })
                                    }
                                    className="mt-1 h-3.5 w-3.5 shrink-0 accent-[color:var(--accent)]"
                                />
                            )}
                            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium text-foreground">{pr.title}</p>
                                <p className="mt-0.5 text-[11.5px] text-muted">
                                    #{pr.number} · {pr.sourceBranch} → {pr.targetBranch} · opened {pr.createdAt} by {pr.author}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1 text-[11.5px] text-muted">
                                <MessageSquare className="h-3.5 w-3.5" /> {pr.comments}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}