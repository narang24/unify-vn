"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { GitBranch, AlertCircle, Search, Lock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listGithubRepos, type GhRepo } from "@/lib/api";
import type { ConnectedRepository } from "@/lib/repo-types";

const COLORS = ["#3a93b1", "#7c5cff", "#1f9d6f", "#d1495b"];

export function ConnectGithubDialog({
    open,
    onOpenChange,
    onConnect,
}: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    onConnect: (repo: ConnectedRepository) => void;
}) {
    const [url, setUrl] = useState("");
    const [error, setError] = useState("");
    const [connecting, setConnecting] = useState(false);

    // Real repos from the user's connected GitHub account (no PAT required).
    const [repos, setRepos] = useState<GhRepo[] | null>(null);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [notConnected, setNotConnected] = useState(false);
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (!open) return;
        setLoadingRepos(true);
        setNotConnected(false);
        listGithubRepos()
            .then((r) => setRepos(r))
            .catch(() => { setRepos(null); setNotConnected(true); })
            .finally(() => setLoadingRepos(false));
    }, [open]);

    function connectFromRepo(r: GhRepo) {
        onConnect({
            id: `repo_${Date.now()}`,
            name: r.name,
            fullName: r.fullName,
            provider: "github",
            defaultBranch: r.defaultBranch,
            connectedAt: "just now",
            avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
        onOpenChange(false);
    }

    function handleConnectUrl() {
        const trimmed = url.trim();
        const match = trimmed.match(/github\.com\/([\w.-]+)\/([\w.-]+)/i);
        if (!match) {
            setError("Paste a valid GitHub repository URL.");
            return;
        }
        setConnecting(true);
        setError("");
        setTimeout(() => {
            const [, owner, name] = match;
            onConnect({
                id: `repo_${Date.now()}`,
                name: name.replace(/\.git$/, ""),
                fullName: `${owner}/${name.replace(/\.git$/, "")}`,
                provider: "github",
                defaultBranch: "main",
                connectedAt: "just now",
                avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
            });
            setConnecting(false);
            setUrl("");
            onOpenChange(false);
        }, 500);
    }

    const filtered = (repos ?? []).filter((r) => r.fullName.toLowerCase().includes(query.toLowerCase()));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent title="Connect a repository" className="max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                            <GitBranch className="h-4 w-4 text-foreground" />
                        </div>
                        <div>
                            <DialogTitle>Connect a GitHub repository</DialogTitle>
                            <DialogDescription>Pick one of your repositories — no token or webhook setup needed.</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Your repositories (real, via OAuth) */}
                {loadingRepos ? (
                    <div className="flex items-center gap-1.5 py-6 text-[12.5px] text-muted">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading your repositories…
                    </div>
                ) : repos && repos.length > 0 ? (
                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your repositories" className="h-9 pl-8 text-[13px]" />
                        </div>
                        <div className="max-h-64 space-y-0.5 overflow-y-auto scroll-thin rounded-lg border border-border-subtle p-1">
                            {filtered.map((r) => (
                                <button
                                    key={r.fullName}
                                    onClick={() => connectFromRepo(r)}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-foreground/[0.06]"
                                >
                                    <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-medium text-foreground">{r.fullName}</p>
                                        {r.description && <p className="truncate text-[11.5px] text-muted">{r.description}</p>}
                                    </div>
                                    {r.private && <Lock className="h-3 w-3 shrink-0 text-muted" />}
                                    {r.language && <span className="shrink-0 text-[10.5px] text-muted">{r.language}</span>}
                                </button>
                            ))}
                            {filtered.length === 0 && <p className="px-2 py-3 text-center text-[12px] text-muted">No repositories match.</p>}
                        </div>
                    </div>
                ) : (
                    notConnected && (
                        <div className="rounded-lg border border-border-subtle bg-panel-strong/40 p-3 text-[12.5px] text-muted">
                            Sign in with GitHub to list your repositories automatically, or paste a URL below.
                        </div>
                    )
                )}

                {/* URL fallback */}
                <div className="mt-3 space-y-1.5">
                    <Label htmlFor="repo-url">…or paste a repository URL</Label>
                    <Input
                        id="repo-url"
                        placeholder="https://github.com/org/repo"
                        value={url}
                        onChange={(e) => { setUrl(e.target.value); setError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleConnectUrl()}
                    />
                </div>
                {error && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-red-500">
                        <AlertCircle className="h-3.5 w-3.5" /> {error}
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleConnectUrl} disabled={!url.trim() || connecting}>
                        {connecting ? "Connecting…" : "Connect from URL"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
