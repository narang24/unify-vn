"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, GitMerge, Link2, CheckCircle2, AlertCircle, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Provider = "github" | "gitlab";

interface ConnectedRepo {
  id: string;
  provider: Provider;
  name: string;
  url: string;
  connectedAt: string;
}

interface ConnectRepoDialogProps {
  open: boolean;
  onClose: () => void;
  spaceName: string;
  onConnected?: (repo: import("@/lib/repo-types").ConnectedRepository) => void;
}

export function ConnectRepoDialog({ open, onClose, spaceName, onConnected }: ConnectRepoDialogProps) {
  const [provider, setProvider] = useState<Provider>("github");
  const [repoUrl, setRepoUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState<ConnectedRepo[]>([]);
  const [error, setError] = useState("");

  function handleConnect() {
    const trimmed = repoUrl.trim();
    if (!trimmed) { setError("Paste a repository URL."); return; }
    if (connected.find((r) => r.url === trimmed)) { setError("Already connected."); return; }
    const githubRe = /github\.com\/[\w.-]+\/[\w.-]+/i;
    const gitlabRe = /gitlab\.com\/[\w./-]+/i;
    if (provider === "github" && !githubRe.test(trimmed)) { setError("Looks like an invalid GitHub URL."); return; }
    if (provider === "gitlab" && !gitlabRe.test(trimmed)) { setError("Looks like an invalid GitLab URL."); return; }

    setConnecting(true);
    setError("");
    setTimeout(() => {
      const match = trimmed.match(/(?:github|gitlab)\.com\/([\w./-]+)/i);
      const fullName = match?.[1] ?? trimmed;
      const shortName = fullName.split("/").pop()?.replace(/\.git$/, "") ?? fullName;
      setConnected((prev) => [
        ...prev,
        {
          id: `repo-${Date.now()}`,
          provider,
          name: fullName,
          url: trimmed,
          connectedAt: new Date().toLocaleDateString(),
        },
      ]);
      setRepoUrl("");
      setConnecting(false);
      onConnected?.({
        id: `repo_${Date.now()}`,
        name: shortName,
        fullName: fullName.replace(/\.git$/, ""),
        provider,
        defaultBranch: "main",
        connectedAt: "just now",
        avatarColor: ["#3a93b1", "#7c5cff", "#1f9d6f", "#d1495b"][Math.floor(Math.random() * 4)],
      });
    }, 900);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/45"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-md rounded-2xl border border-border-subtle bg-panel p-6 shadow-2xl"
        >
          {/* Title */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <Link2 className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-foreground">Connect Repository</h2>
                <p className="text-[11.5px] text-muted">{spaceName}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-foreground/[0.06]">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Provider tabs */}
          <div className="mb-4 flex rounded-xl border border-border-subtle bg-panel-strong/30 p-0.5 gap-0.5">
            {(["github", "gitlab"] as Provider[]).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 text-[12.5px] font-medium transition-all",
                  provider === p
                    ? "bg-panel text-foreground shadow-sm"
                    : "text-muted hover:text-foreground",
                )}
              >
                {p === "github" ? (
                  <GitBranch className="h-4 w-4" />
                ) : (
                  <GitMerge className="h-4 w-4" style={{ color: "#fc6d26" }} />
                )}
                {p === "github" ? "GitHub" : "GitLab"}
              </button>
            ))}
          </div>

          {/* Features list */}
          <div className="mb-4 rounded-xl border border-border-subtle bg-panel-strong/20 p-3 space-y-1.5">
            <p className="text-[11.5px] font-semibold text-muted mb-2">What gets synced</p>
            {[
              "Commits & branch activity",
              "Pull / Merge requests → work items",
              "Issues ↔ tasks (bi-directional)",
              "Deployment events → status updates",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-[12px] text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                {f}
              </div>
            ))}
          </div>

          {/* URL input */}
          <div className="flex gap-2 mb-1">
            <div className="relative flex-1">
              {provider === "github" ? (
                <GitBranch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              ) : (
                <GitMerge className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              )}
              <Input
                placeholder={
                  provider === "github"
                    ? "https://github.com/org/repo"
                    : "https://gitlab.com/org/repo"
                }
                value={repoUrl}
                onChange={(e) => { setRepoUrl(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                className="h-9 pl-8 text-[13px]"
              />
            </div>
            <Button onClick={handleConnect} size="sm" className="h-9 shrink-0" disabled={connecting}>
              {connecting ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Connect"
              )}
            </Button>
          </div>

          {error && (
            <div className="mb-3 flex items-center gap-1.5 text-[11.5px] text-red-500">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </div>
          )}

          {/* Connected repos */}
          {connected.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">
                Connected ({connected.length})
              </p>
              <AnimatePresence initial={false}>
                {connected.map((repo) => (
                  <motion.div
                    key={repo.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-3 rounded-xl border border-border-subtle p-2.5"
                  >
                    {repo.provider === "github" ? (
                      <GitBranch className="h-4 w-4 shrink-0 text-foreground" />
                    ) : (
                      <GitMerge className="h-4 w-4 shrink-0" style={{ color: "#fc6d26" }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-foreground">{repo.name}</p>
                      <p className="text-[11px] text-muted">Connected {repo.connectedAt}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-500">
                      <Zap className="h-3 w-3" /> Live
                    </div>
                    <button
                      onClick={() => setConnected((c) => c.filter((r) => r.id !== repo.id))}
                      className="rounded-md p-0.5 text-muted hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
