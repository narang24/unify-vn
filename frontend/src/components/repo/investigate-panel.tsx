"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ShieldAlert,
  AlertTriangle,
  Wrench,
  Lightbulb,
  RotateCcw,
  GitPullRequest,
  CheckCircle2,
  ChevronRight,
  Database,
} from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { RootCauseAnalysis } from "@/lib/incident-agent";
import type { Deployment } from "@/lib/incident-agent";

interface InvestigatePanelProps {
  open: boolean;
  onClose: () => void;
  deployment: Deployment | null;
  rca: RootCauseAnalysis | null;
  analyzing: boolean;
  onAskIntelli: (rca?: RootCauseAnalysis) => void;
  onReanalyze: () => void;
  onGeneratePR: () => void;
  prNumber?: number;
}

export function InvestigatePanel({
  open,
  onClose,
  deployment,
  rca,
  analyzing,
  onAskIntelli,
  onReanalyze,
  onGeneratePR,
  prNumber,
}: InvestigatePanelProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-150 flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-[#031517]/50"
            onClick={onClose}
          />

          {/* Panel — slides in from the right */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            className="relative ml-auto flex h-full w-full max-w-[520px] flex-col overflow-y-auto scroll-thin border-l border-border-subtle bg-panel shadow-2xl"
          >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border-subtle bg-panel px-4 py-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/12">
                <ShieldAlert className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  Investigate Failure
                </p>
                {deployment && (
                  <p className="truncate text-[11px] text-muted">
                    {deployment.commitMessage} · {deployment.environment} · {deployment.triggeredAt}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="ml-2 rounded-md p-1.5 text-muted hover:bg-foreground/[0.06] hover:text-foreground"
                aria-label="Close investigate panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div className="flex-1 p-4 space-y-5">
              {analyzing && !rca ? (
                <AnalyzingState />
              ) : rca ? (
                <>
                  {/* Incident Category — highlighted red */}
                  <IncidentCategoryBadge category={rca.classification.category} confidence={rca.confidence} />

                  {/* Root Cause */}
                  <PanelSection icon={<AlertTriangle className="h-3.5 w-3.5 text-danger" />} title="Root Cause">
                    <p className="text-[12.5px] leading-relaxed text-foreground">{rca.rootCause}</p>
                  </PanelSection>

                  {/* Explanation */}
                  <PanelSection icon={<Lightbulb className="h-3.5 w-3.5 text-amber-400" />} title="Explanation">
                    <p className="text-[12.5px] leading-relaxed text-muted">{rca.explanation}</p>
                  </PanelSection>

                  {/* Investigation Workflow */}
                  {rca.investigationWorkflow && rca.investigationWorkflow.length > 0 && (
                    <PanelSection icon={<ChevronRight className="h-3.5 w-3.5 text-accent" />} title="Investigation Workflow">
                      <WorkflowTimeline steps={rca.investigationWorkflow} />
                    </PanelSection>
                  )}

                  {/* Recommended Fix */}
                  <PanelSection icon={<Wrench className="h-3.5 w-3.5 text-accent" />} title="Recommended Fix">
                    <p className="text-[12.5px] leading-relaxed text-foreground">{rca.recommendedFix}</p>
                  </PanelSection>

                  {/* Code Suggestions */}
                  {rca.codeSnippet?.code && (
                    <PanelSection title="Code Suggestion">
                      <CodeBlock snippet={rca.codeSnippet} />
                    </PanelSection>
                  )}

                  {/* RAG sources */}
                  {rca.ragSources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Database className="h-3 w-3 shrink-0 text-muted" />
                      <span className="text-[11px] font-medium text-muted">RAG sources:</span>
                      {rca.ragSources.map((src) => (
                        <span
                          key={src}
                          className="rounded-full border border-border-subtle bg-panel px-2 py-0.5 font-mono text-[10px] text-muted"
                        >
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-40 items-center justify-center">
                  <p className="text-[13px] text-muted">No analysis available yet.</p>
                </div>
              )}
            </div>

            {/* ── Action bar ─────────────────────────────────────────────── */}
            {rca && (
              <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-border-subtle bg-panel px-4 py-3">
                {prNumber ? (
                  <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-medium text-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5" /> PR #{prNumber} drafted
                  </span>
                ) : (
                  <button
                    id="investigate-panel-generate-pr"
                    onClick={onGeneratePR}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-foreground hover:bg-accent-soft"
                  >
                    <GitPullRequest className="h-3.5 w-3.5" /> Generate Pull Request
                  </button>
                )}
                <button
                  id="investigate-panel-ask-intelli"
                  onClick={() => onAskIntelli(rca)}
                  className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-foreground/[0.06]"
                >
                  <Lightbulb className="h-3.5 w-3.5 text-accent" /> Ask Unify Intelli
                </button>
                <button
                  id="investigate-panel-reanalyze"
                  onClick={onReanalyze}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Re-analyze
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IncidentCategoryBadge({ category, confidence }: { category: string; confidence: number }) {
  const pct = Math.round(confidence * 100);
  return (
    <div className="rounded-xl border border-danger/20 bg-danger/[0.07] p-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-danger/12">
          <ShieldAlert className="h-4 w-4 text-danger" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-danger/70">
            Incident Category Detected
          </p>
          <p className="mt-0.5 text-[14px] font-bold text-danger">{category}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-[11px] font-semibold text-danger">{pct}%</span>
          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-danger/20">
            <div className="h-full rounded-full bg-danger" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-danger/60">confidence</span>
        </div>
      </div>
    </div>
  );
}

function PanelSection({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      </div>
      {children}
    </div>
  );
}

function WorkflowTimeline({ steps }: { steps: { step: number; label: string; detail: string }[] }) {
  return (
    <div className="space-y-0">
      {steps.map((s, i) => (
        <div key={s.step} className="flex gap-3">
          {/* Connector line + dot */}
          <div className="flex flex-col items-center">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-[10px] font-bold text-accent">
              {s.step}
            </div>
            {i < steps.length - 1 && (
              <div className="w-px flex-1 bg-gradient-to-b from-accent/20 to-transparent" style={{ minHeight: 20 }} />
            )}
          </div>
          {/* Content */}
          <div className={cn("pb-4 min-w-0", i === steps.length - 1 && "pb-0")}>
            <p className="text-[12px] font-semibold text-foreground">{s.label}</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{s.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ snippet }: { snippet: { filename: string; language: string; code: string } }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="font-mono text-[11px] text-[#8b949e]">{snippet.filename}</span>
        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] uppercase tracking-wide text-[#8b949e]">
          {snippet.language}
        </span>
      </div>
      <pre className="overflow-x-auto scroll-thin p-3 text-[11.5px] leading-relaxed text-[#c9d1d9]">
        <code>{snippet.code}</code>
      </pre>
    </div>
  );
}

function AnalyzingState() {
  const steps = ["Classifying incident", "Pulling deployment logs", "Scanning repository memory", "Tracing execution paths", "Synthesising root cause"];
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % steps.length), 1400);
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
        </span>
        <p className="text-[13px] font-semibold text-accent">Unify Intelli is investigating…</p>
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div
            key={step}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] transition-all duration-500",
              i === active
                ? "bg-accent/10 text-accent"
                : i < active
                ? "text-muted/60"
                : "text-muted/30",
            )}
          >
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-all",
                i === active ? "bg-accent scale-125" : i < active ? "bg-muted/40" : "bg-muted/20",
              )}
            />
            {step}
            {i < active && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
          </div>
        ))}
      </div>
    </div>
  );
}
