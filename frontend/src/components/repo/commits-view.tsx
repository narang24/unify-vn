"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { GitBranch, GitCommit, Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConnectedRepository } from "@/lib/repo-types";
import { getRepoBranches, getRepoCommits, type GhBranch, type GhCommit } from "@/lib/api";

function fmtDate(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

export function CommitsView({ repo }: { repo?: ConnectedRepository }) {
  const [branches, setBranches] = React.useState<GhBranch[]>([]);
  const [activeBranch, setActiveBranch] = React.useState<string>(repo?.defaultBranch ?? "main");
  const [commits, setCommits] = React.useState<GhCommit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [connected, setConnected] = React.useState(true);

  React.useEffect(() => {
    if (!repo) { setConnected(false); setLoading(false); return; }
    getRepoBranches(repo.id)
      .then((b) => {
        setBranches(b);
        setConnected(true);
        setActiveBranch((prev) => (b.find((x) => x.name === prev) ? prev : b[0]?.name ?? prev));
      })
      .catch(() => setConnected(false));
  }, [repo]);

  React.useEffect(() => {
    if (!repo) { setLoading(false); return; }
    setLoading(true);
    getRepoCommits(repo.id, activeBranch)
      .then((c) => { setCommits(c); setConnected(true); })
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  }, [repo, activeBranch]);

  if (!connected) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <GitBranch className="mx-auto mb-2 h-8 w-8 text-muted" />
          <p className="text-[13px] font-medium text-foreground">Sign in with GitHub to browse branches & commits.</p>
          <p className="mt-1 text-[12px] text-muted">No token or webhook setup required — it&apos;s automatic once connected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Branches rail */}
      <div className="w-56 shrink-0 overflow-y-auto scroll-thin border-r border-border-subtle p-2">
        <p className="px-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Branches</p>
        <div className="space-y-0.5">
          {branches.map((b) => (
            <button
              key={b.name}
              onClick={() => setActiveBranch(b.name)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] hover:bg-foreground/[0.06]",
                b.name === activeBranch ? "bg-accent/10 font-medium text-accent" : "text-foreground",
              )}
            >
              <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted" />
              <span className="truncate">{b.name}</span>
              {b.protected && <Shield className="ml-auto h-3 w-3 shrink-0 text-amber-500" />}
            </button>
          ))}
          {branches.length === 0 && <p className="px-2 py-1 text-[11.5px] text-muted">No branches.</p>}
        </div>
      </div>

      {/* Commits */}
      <div className="min-w-0 flex-1 overflow-y-auto scroll-thin p-4">
        <p className="mb-3 flex items-center gap-1.5 text-[12px] text-muted">
          {loading ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Loading commits…</>
          ) : (
            <>Commits on <span className="font-medium text-foreground">{activeBranch}</span></>
          )}
        </p>
        <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-panel">
          {commits.map((c, i) => (
            <motion.div
              key={c.sha}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.2) }}
              className="flex items-center gap-3 px-3.5 py-2.5"
            >
              <GitCommit className="h-4 w-4 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">{c.message}</p>
                <p className="text-[11.5px] text-muted">{c.author} · {fmtDate(c.date)}</p>
              </div>
              <code className="shrink-0 rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[10.5px] text-muted">{c.shortSha}</code>
            </motion.div>
          ))}
          {!loading && commits.length === 0 && (
            <p className="px-3.5 py-6 text-center text-[12.5px] text-muted">No commits found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
