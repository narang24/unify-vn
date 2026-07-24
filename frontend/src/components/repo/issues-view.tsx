"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CircleDot, CircleCheck, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEED_ISSUES } from "@/lib/repo-types";
import type { ContextChip, ConnectedRepository } from "@/lib/repo-types";
import { getRepoIssues, type GhIssue } from "@/lib/api";

function fmtDate(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

export function IssuesView({
    repo,
    selectMode,
    selectedChips,
    onAddChip,
    onRemoveChip,
}: {
    repo?: ConnectedRepository;
    selectMode: boolean;
    selectedChips: ContextChip[];
    onAddChip: (chip: ContextChip) => void;
    onRemoveChip: (id: string) => void;
}) {
    const selectedIds = new Set(selectedChips.filter((c) => c.type === "issue").map((c) => c.meta));
    const [issues, setIssues] = React.useState<GhIssue[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [live, setLive] = React.useState(false);

    React.useEffect(() => {
        let active = true;
        setLoading(true);
        if (!repo) {
            setIssues(SEED_ISSUES as unknown as GhIssue[]);
            setLoading(false);
            return;
        }
        getRepoIssues(repo.id)
            .then((data) => { if (active) { setIssues(data); setLive(true); } })
            .catch(() => { if (active) { setIssues(SEED_ISSUES as unknown as GhIssue[]); setLive(false); } })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [repo]);

    return (
        <div className="h-full overflow-y-auto scroll-thin p-4">
            <p className="mb-3 flex items-center gap-1.5 text-[12px] text-muted">
                {loading ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Loading issues…</>
                ) : live ? (
                    <>Live from GitHub · {issues.length} issues</>
                ) : (
                    <>Connect GitHub to see live issues. <span className="opacity-70">(showing sample data)</span></>
                )}
            </p>
            <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-panel">
                {issues.map((issue, i) => {
                    const checked = selectedIds.has(issue.id);
                    return (
                        <motion.div
                            key={issue.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i * 0.02, 0.2) }}
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
                                    #{issue.number} opened {fmtDate(issue.createdAt)} by {issue.author}
                                </p>
                                {issue.labels.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                        {issue.labels.map((l) => (
                                            <span key={l} className={cn("rounded-full px-1.5 py-0.5 text-[10.5px] font-medium", "bg-accent/10 text-accent")}>
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
                {!loading && issues.length === 0 && (
                    <p className="px-3.5 py-6 text-center text-[12.5px] text-muted">No issues found.</p>
                )}
            </div>
        </div>
    );
}
