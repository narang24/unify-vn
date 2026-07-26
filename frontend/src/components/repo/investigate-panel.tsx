"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  RotateCcw,
  GitPullRequest,
  CheckCircle2,
  Database,
  Loader2,
  Lightbulb,
} from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { RootCauseAnalysis } from "@/lib/incident-agent";
import type { Deployment } from "@/lib/incident-agent";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
          {/* Backdrop — dark, no blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            className="relative ml-auto flex h-full w-full max-w-130 flex-col overflow-y-auto scroll-thin border-l border-border-subtle bg-panel shadow-2xl"
          >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-panel px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-foreground">
                  {deployment?.commitMessage ?? "Deployment Failure"}
                </p>
                <p className="mt-0.5 text-[11.5px] font-semibold text-muted">
                  {deployment?.environment ?? "Production"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="ml-4 shrink-0 rounded-md p-1.5 text-muted hover:bg-foreground/[0.06] hover:text-foreground"
                aria-label="Close investigate panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Body ─────────────────────────────────────────────────── */}
            <div className="flex-1 space-y-5 p-5">
              {analyzing && !rca ? (
                <AnalyzingState />
              ) : rca ? (
                <>
                  {/* Incident Category — shadcn Alert */}
                  <Alert variant="destructive" className="font-semibold">
                    <AlertTitle className="text-[13px] font-bold">
                      {rca.classification.category}
                    </AlertTitle>
                    <AlertDescription className="mt-0.5 text-[11.5px] font-semibold text-red-700/80">
                      Incident category detected · {Math.round(rca.confidence * 100)}% confidence
                    </AlertDescription>
                  </Alert>

                  <Separator />

                  {/* Root Cause */}
                  <div>
                    <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-foreground">
                      Root Cause
                    </p>
                    <p className="text-[12.5px] font-semibold leading-relaxed text-foreground">
                      {rca.rootCause}
                    </p>
                  </div>

                  <Separator />

                  {/* Explanation + Workflow — shadcn Accordion */}
                  <Accordion type="multiple" defaultValue={["explanation", "workflow"]} className="space-y-1">
                    <AccordionItem value="explanation" className="rounded-lg border border-border-subtle bg-panel-strong/20 px-4">
                      <AccordionTrigger className="text-[12px] font-bold uppercase tracking-wide text-foreground hover:no-underline py-3">
                        Explanation
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <p className="text-[12.5px] font-semibold leading-relaxed text-muted">
                          {rca.explanation}
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    {rca.investigationWorkflow && rca.investigationWorkflow.length > 0 && (
                      <AccordionItem value="workflow" className="rounded-lg border border-border-subtle bg-panel-strong/20 px-4">
                        <AccordionTrigger className="text-[12px] font-bold uppercase tracking-wide text-foreground hover:no-underline py-3">
                          Investigation Workflow
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <WorkflowTimeline steps={rca.investigationWorkflow} />
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>

                  <Separator />

                  {/* Recommended Fix */}
                  <div>
                    <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-foreground">
                      Recommended Fix
                    </p>
                    <p className="text-[12.5px] font-semibold leading-relaxed text-foreground">
                      {rca.recommendedFix}
                    </p>
                  </div>

                  {/* Code Suggestion */}
                  {rca.codeSnippet?.code && (
                    <>
                      <Separator />
                      <div>
                        <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-foreground">
                          Code Suggestion
                        </p>
                        <CodeBlock snippet={rca.codeSnippet} />
                      </div>
                    </>
                  )}

                  {/* RAG sources */}
                  {rca.ragSources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-muted">RAG sources:</span>
                      {rca.ragSources.map((src) => (
                        <Badge key={src} variant="outline" className="font-mono text-[10px] font-semibold">
                          {src}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-40 items-center justify-center">
                  <p className="text-[13px] font-semibold text-muted">No analysis available yet.</p>
                </div>
              )}
            </div>

            {/* ── Action bar ─────────────────────────────────────────────── */}
            {rca && (
              <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-border-subtle bg-panel px-5 py-3">
                {prNumber ? (
                  <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5" /> PR #{prNumber} drafted
                  </span>
                ) : (
                  <button
                    id="investigate-panel-generate-pr"
                    onClick={onGeneratePR}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-foreground hover:bg-accent-soft"
                  >
                    <GitPullRequest className="h-3.5 w-3.5" /> Generate Pull Request
                  </button>
                )}
                <button
                  id="investigate-panel-ask-intelli"
                  onClick={() => onAskIntelli(rca)}
                  className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-foreground/[0.06]"
                >
                  <Lightbulb className="h-3.5 w-3.5 text-accent" /> Ask Unify Intelli
                </button>
                <button
                  id="investigate-panel-reanalyze"
                  onClick={onReanalyze}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:bg-foreground/[0.06] hover:text-foreground"
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

function WorkflowTimeline({ steps }: { steps: { step: number; label: string; detail: string }[] }) {
  return (
    <div className="space-y-0">
      {steps.map((s, i) => (
        <div key={s.step} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-[10px] font-bold text-accent">
              {s.step}
            </div>
            {i < steps.length - 1 && (
              <div className="w-px flex-1 bg-linear-to-b from-accent/20 to-transparent" style={{ minHeight: 20 }} />
            )}
          </div>
          <div className={cn("pb-4 min-w-0", i === steps.length - 1 && "pb-0")}>
            <p className="text-[12px] font-semibold text-foreground">{s.label}</p>
            <p className="mt-0.5 text-[11.5px] font-semibold leading-relaxed text-muted">{s.detail}</p>
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
        <span className="font-mono text-[11px] font-semibold text-[#8b949e]">{snippet.filename}</span>
        <span className="rounded bg-white/6 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-[#8b949e]">
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
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all duration-500",
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
