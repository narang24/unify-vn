"use client";

import { useState } from "react";
import { GitBranch, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConnectedRepository } from "@/lib/repo-types";

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

    function handleConnect() {
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
                avatarColor: ["#3a93b1", "#7c5cff", "#1f9d6f", "#d1495b"][Math.floor(Math.random() * 4)],
            });
            setConnecting(false);
            setUrl("");
            onOpenChange(false);
        }, 700);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent title="Connect a repository">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                            <GitBranch className="h-4 w-4 text-foreground" />
                        </div>
                        <div>
                            <DialogTitle>Connect a GitHub repository</DialogTitle>
                            <DialogDescription>It'll appear in your sidebar as its own workspace.</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-1.5">
                    <Label htmlFor="repo-url">Repository URL</Label>
                    <Input
                        id="repo-url"
                        autoFocus
                        placeholder="https://github.com/org/repo"
                        value={url}
                        onChange={(e) => { setUrl(e.target.value); setError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                    />
                </div>
                {error && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-red-500">
                        <AlertCircle className="h-3.5 w-3.5" /> {error}
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleConnect} disabled={!url.trim() || connecting}>
                        {connecting ? "Connecting…" : "Connect repository"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}