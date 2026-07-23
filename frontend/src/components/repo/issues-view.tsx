"use client";

import { motion } from "framer-motion";
import { CircleDot, CircleCheck, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEED_ISSUES } from "@/lib/repo-types";
import type { ContextChip } from "@/lib/repo-types";

export function IssuesView({
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
    const selectedIds = new Set(selectedChips.filter((c) => c.type === "issue").map((c) => c.meta));

    return (
        <div className="h-full overflow-y-auto scroll-thin p-4">
            <p className="mb-3 text-[12px] text-muted">
                Fetched from GitHub for this repository. <span className="opacity-70">(mock data — live sync pending)</span>
            </p>
            <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-panel">
                {SEED_ISSUES.map((issue, i) => {
                    const checked = selectedIds.has(issue.id);
                    return (
                        <motion.div
                            key={issue.id}
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
                                            ? onRemoveChip(`ctx_issue_${issue.id}`)
                                            : onAddChip({ id: `ctx_issue_${issue.id}`, type: "issue", label: `#${issue.number} ${issue.title}`, meta: issue.id })
                                    }
                                    className="mt-1 h-3.5 w-3.5 shrink-0 accent-[color:var(--accent)]"
                                />
                            )}
                            {issue.state === "open" ? (
                                <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            ) : (
                                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium text-foreground">{issue.title}</p>
                                <p className="mt-0.5 text-[11.5px] text-muted">
                                    #{issue.number} opened {issue.createdAt} by {issue.author}
                                </p>
                                {issue.labels.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                        {issue.labels.map((l) => (
                                            <span
                                                key={l}
                                                className={cn(
                                                    "rounded-full px-1.5 py-0.5 text-[10.5px] font-medium",
                                                    "bg-accent/10 text-accent",
                                                )}
                                            >
                                                {l}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1 text-[11.5px] text-muted">
                                <MessageSquare className="h-3.5 w-3.5" /> {issue.comments}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}