"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  X,
  GitPullRequest,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PrDraft } from "@/lib/incident-agent";

interface PrDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owner: string;
  repo: string;
  draft: PrDraft | null;
  loading: boolean;
}

export function PrDraftModal({ open, onOpenChange, owner, repo, draft, loading }: PrDraftModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handler);
    };
  }, [open, onOpenChange]);

  function openGitHub() {
    if (!draft) return;
    const branch = encodeURIComponent(draft.branch);
    const title  = encodeURIComponent(draft.title);
    const body   = encodeURIComponent(draft.body);
    // Pre-fill GitHub's compare/PR creation page.
    const url = `https://github.com/${owner}/${repo}/compare/main...${branch}?quick_pull=1&title=${title}&body=${body}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function copyBody() {
    if (!draft?.body) return;
    navigator.clipboard.writeText(draft.body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/50"
            onClick={() => onOpenChange(false)}
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="PR Draft"
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border-subtle bg-panel shadow-[0_32px_80px_rgba(0,0,0,0.38)]"
            style={{ maxHeight: "90vh" }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center gap-2.5 border-b border-border-subtle px-5 py-3.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/12">
                <GitPullRequest className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground">Generate Pull Request</p>
                <p className="text-[11px] text-muted">
                  {loading
                    ? "Unify Intelli is preparing a repo-compliant draft…"
                    : `${owner}/${repo} · ${draft?.branch ?? ""}`}
                </p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-md p-1.5 text-muted hover:bg-foreground/[0.06] hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
              {loading ? (
                <LoadingState />
              ) : draft ? (
                <div className="space-y-4 p-5">
                  {/* Title */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                      PR Title
                    </label>
                    <div className="rounded-lg border border-border-subtle bg-panel-strong/30 px-3 py-2.5 text-[13px] font-medium text-foreground">
                      {draft.title}
                    </div>
                  </div>

                  {/* Branch */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Branch
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-panel-strong/30 px-3 py-2.5">
                      <GitBranch className="h-3.5 w-3.5 shrink-0 text-accent" />
                      <span className="font-mono text-[12.5px] text-foreground">{draft.branch}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        PR Body
                      </label>
                      <button
                        onClick={copyBody}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted hover:bg-foreground/[0.06] hover:text-foreground"
                      >
                        {copied ? (
                          <><Check className="h-3 w-3 text-emerald-500" /> Copied</>
                        ) : (
                          <><Copy className="h-3 w-3" /> Copy</>
                        )}
                      </button>
                    </div>
                    <pre className="max-h-72 overflow-y-auto scroll-thin rounded-lg border border-border-subtle bg-[#0d1117] p-4 text-[12px] leading-relaxed text-[#c9d1d9] whitespace-pre-wrap">
                      {draft.body}
                    </pre>
                  </div>

                  {/* Disclaimer */}
                  <p className="rounded-lg bg-amber-500/8 px-3 py-2 text-[11px] leading-relaxed text-amber-400/80">
                    ✦ This draft was generated by Unify Intelli following the repository&apos;s PR template
                    and contribution guidelines. Review it before opening the PR on GitHub.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-border-subtle px-5 py-3.5">
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-border-subtle px-4 py-2 text-[12.5px] font-medium text-foreground hover:bg-foreground/[0.06]"
              >
                Close
              </button>
              {!loading && draft && (
                <button
                  id="pr-draft-modal-open-github"
                  onClick={openGitHub}
                  className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[12.5px] font-medium text-accent-foreground hover:bg-accent-soft"
                >
                  <GitPullRequest className="h-3.5 w-3.5" />
                  Open GitHub
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function LoadingState() {
  const messages = [
    "Fetching repository PR template…",
    "Reading contribution guidelines…",
    "Analysing the root cause and fix…",
    "Drafting a repo-compliant PR…",
  ];
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setIdx((i) => Math.min(i + 1, messages.length - 1)), 1800);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-14">
      <div className="relative">
        <Loader2 className="h-9 w-9 animate-spin text-accent" />
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="text-[13px] font-medium text-muted"
        >
          {messages[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
