"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { GitPullRequest, GitMerge, XCircle, MessageSquare, Loader2 } from "lucide-react";
import { SEED_PULL_REQUESTS } from "@/lib/repo-types";
import type { ContextChip, ConnectedRepository } from "@/lib/repo-types";
import { getRepoPulls, type GhPull } from "@/lib/api";

const STATE_ICON = {
  open: { icon: GitPullRequest, color: "text-emerald-500" },
  merged: { icon: GitMerge, color: "text-purple-500" },
  closed: { icon: XCircle, color: "text-red-500" },
};

function fmtDate(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

export function PullRequestsView({
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
  const selectedIds = new Set(selectedChips.filter((c) => c.type === "pr").map((c) => c.meta));
  const [pulls, setPulls] = React.useState<GhPull[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [live, setLive] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    if (!repo) {
      setPulls(SEED_PULL_REQUESTS as unknown as GhPull[]);
      setLoading(false);
      return;
    }
    getRepoPulls(repo.id)
      .then((data) => { if (active) { setPulls(data); setLive(true); } })
      .catch(() => { if (active) { setPulls(SEED_PULL_REQUESTS as unknown as GhPull[]); setLive(false); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [repo]);

  return (
    <div className="h-full overflow-y-auto scroll-thin p-4">
      <p className="mb-3 flex items-center gap-1.5 text-[12px] text-muted">
        {loading ? (
          <><Loader2 className="h-3 w-3 animate-spin" /> Loading pull requests…</>
        ) : live ? (
          <>Live from GitHub · {pulls.length} pull requests</>
        ) : (
          <>Connect GitHub to see live PRs. <span className="opacity-70">(showing sample data)</span></>
        )}
      </p>
      <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-panel">
        {pulls.map((pr, i) => {
          const { icon: Icon, color } = STATE_ICON[pr.state] ?? STATE_ICON.open;
          const checked = selectedIds.has(pr.id);
          return (
            <motion.div
              key={pr.id}
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
                  #{pr.number} · {pr.sourceBranch} → {pr.targetBranch} · opened {fmtDate(pr.createdAt)} by {pr.author}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-[11.5px] text-muted">
                <MessageSquare className="h-3.5 w-3.5" /> {pr.comments}
              </div>
            </motion.div>
          );
        })}
        {!loading && pulls.length === 0 && (
          <p className="px-3.5 py-6 text-center text-[12.5px] text-muted">No pull requests found.</p>
        )}
      </div>
    </div>
  );
}
