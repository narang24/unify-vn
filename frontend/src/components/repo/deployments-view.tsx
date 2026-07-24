"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Loader2,
  RotateCcw,
  Rocket,
  Sparkles,
  GitPullRequest,
  Lightbulb,
  ChevronDown,
  Wrench,
  Database,
  ShieldAlert,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIncidents } from "@/lib/incident-context";
import { isFailure, toolLabel, type Deployment, type DeploymentStatus, type RootCauseAnalysis } from "@/lib/incident-agent";
import type { ConnectedRepository } from "@/lib/repo-types";

const STATUS: Record<DeploymentStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  queued: { label: "Queued", icon: Clock, className: "text-muted" },
  building: { label: "Building", icon: Loader2, className: "text-amber-500" },
  deploying: { label: "Deploying", icon: Loader2, className: "text-amber-500" },
  success: { label: "Success", icon: CheckCircle2, className: "text-emerald-500" },
  failed: { label: "Failed", icon: XCircle, className: "text-danger" },
  crashed: { label: "Crashed", icon: AlertOctagon, className: "text-danger" },
  rolled_back: { label: "Rolled back", icon: RotateCcw, className: "text-amber-500" },
};

export function DeploymentsView({
  repo,
  onAskIntelli,
}: {
  repo: ConnectedRepository;
  onAskIntelli: (rca?: RootCauseAnalysis) => void;
}) {
  const incidents = useIncidents();
  const state = incidents.getState(repo.id);
  const [open, setOpen] = React.useState<string | null>(null);

  React.useEffect(() => {
    incidents.ensureRepo(repo.id);
  }, [repo.id, incidents]);

  // Mark recommendations seen once the user is looking at the deployments tab.
  React.useEffect(() => {
    const t = setTimeout(() => incidents.markSeen(repo.id), 500);
    return () => clearTimeout(t);
  }, [repo.id, incidents, state?.analyses]);

  const deployments = state?.deployments ?? [];

  return (
    <div className="h-full overflow-y-auto scroll-thin p-4">
      {/* Repository-memory status bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <IndexBadge state={state?.index ?? "idle"} />
        <p className="text-[12px] text-muted">
          Unify Intelli continuously indexes this repo and analyzes failed deployments automatically.
        </p>
        <button
          onClick={() => incidents.triggerDeployment(repo.id)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[12px] font-medium text-foreground hover:bg-foreground/[0.06]"
        >
          <Rocket className="h-3.5 w-3.5" /> Sync deployments
        </button>
      </div>

      <div className="space-y-2">
        {deployments.map((dep) => {
          const analysis = state?.analyses[dep.id];
          const analyzing = state?.analyzing.includes(dep.id);
          const failed = isFailure(dep.status);
          const isOpen = open === dep.id;
          return (
            <div key={dep.id} className="overflow-hidden rounded-xl border border-border-subtle bg-panel">
              <DeploymentRow
                dep={dep}
                failed={failed}
                analyzing={!!analyzing}
                hasAnalysis={!!analysis}
                isOpen={isOpen}
                onToggle={() => setOpen(isOpen ? null : failed ? dep.id : null)}
              />
              <AnimatePresence initial={false}>
                {isOpen && failed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {analysis ? (
                      <SuggestionPanel
                        rca={analysis}
                        prNumber={state?.prByDeployment[dep.id]}
                        onGeneratePR={() => incidents.generatePullRequest(repo.id, dep.id)}
                        onAsk={() => onAskIntelli(analysis)}
                        onReanalyze={() => incidents.reanalyze(repo.id, dep.id)}
                      />
                    ) : (
                      <AnalyzingPanel />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {deployments.length === 0 && (
          <div className="rounded-xl border border-dashed border-border-subtle py-10 text-center">
            <p className="text-[13px] font-medium text-foreground">No deployments yet.</p>
            <p className="mt-1 text-[12px] text-muted">Trigger a deployment to see its history and status here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function IndexBadge({ state }: { state: "idle" | "indexing" | "ready" }) {
  if (state === "ready") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-500">
        <Database className="h-3 w-3" /> Repository memory ready
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
      <Loader2 className="h-3 w-3 animate-spin" /> Indexing repository…
    </span>
  );
}

function DeploymentRow({
  dep,
  failed,
  analyzing,
  hasAnalysis,
  isOpen,
  onToggle,
}: {
  dep: Deployment;
  failed: boolean;
  analyzing: boolean;
  hasAnalysis: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const s = STATUS[dep.status];
  const Icon = s.icon;
  const spinning = dep.status === "building" || dep.status === "deploying";
  return (
    <button
      onClick={onToggle}
      disabled={!failed}
      className={cn(
        "flex w-full items-center gap-3 px-3.5 py-3 text-left",
        failed && "hover:bg-foreground/[0.03]",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", s.className, spinning && "animate-spin")} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium text-foreground">{dep.commitMessage}</p>
          <span className="shrink-0 rounded bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-muted">
            {dep.environment}
          </span>
          {failed && (analyzing ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/12 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Analyzing
            </span>
          ) : hasAnalysis ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/12 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
              <Sparkles className="h-2.5 w-2.5" /> Suggestion ready
            </span>
          ) : null)}
        </div>
        <p className="mt-0.5 truncate text-[11.5px] text-muted">
          {dep.version} · {s.label} · {dep.commitSha} · {dep.branch} · {dep.triggeredAt} by {dep.author} · {dep.durationSec}s
        </p>
      </div>
      {failed && <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform", isOpen && "rotate-180")} />}
    </button>
  );
}

function AnalyzingPanel() {
  return (
    <div className="border-t border-border-subtle bg-panel-strong/30 p-4">
      <div className="flex items-center gap-2 text-[13px] font-medium text-accent">
        <Loader2 className="h-4 w-4 animate-spin" /> Unify Intelli is investigating…
      </div>
      <p className="mt-1.5 text-[12px] text-muted">
        Classifying the incident, pulling logs, metrics and Kubernetes state, tracing execution paths, and searching
        repository memory and past incidents.
      </p>
    </div>
  );
}

function SuggestionPanel({
  rca,
  prNumber,
  onGeneratePR,
  onAsk,
  onReanalyze,
}: {
  rca: RootCauseAnalysis;
  prNumber?: number;
  onGeneratePR: () => void;
  onAsk: () => void;
  onReanalyze: () => void;
}) {
  return (
    <div className="border-t border-border-subtle bg-panel-strong/30">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/12">
          <Lightbulb className="h-3.5 w-3.5 text-accent" />
        </span>
        <span className="text-[13px] font-semibold text-foreground">Unify Intelli Suggestion</span>
        <span className="ml-1 flex items-center gap-1 rounded-full bg-accent/12 px-2 py-0.5 text-[10.5px] font-semibold text-accent">
          <ShieldAlert className="h-3 w-3" /> {rca.classification.category}
        </span>
        <ConfidenceBar value={rca.confidence} className="ml-auto" />
      </div>

      <div className="space-y-3.5 p-4">
        {/* Root cause */}
        <Section title="Root cause">
          <p className="text-[12.5px] leading-relaxed text-foreground">{rca.rootCause}</p>
        </Section>

        {/* Explanation */}
        <Section title="Explanation">
          <p className="text-[12.5px] leading-relaxed text-muted">{rca.explanation}</p>
        </Section>

        {/* What the agent looked at */}
        <Section title="How Unify Intelli investigated">
          <div className="flex flex-wrap gap-1.5">
            {rca.toolSteps.map((step) => (
              <span
                key={step.tool}
                title={step.detail}
                className="rounded-full border border-border-subtle bg-panel px-2 py-0.5 text-[10.5px] font-medium text-muted"
              >
                {step.label}
              </span>
            ))}
          </div>
          {rca.ragSources.length > 0 && (
            <p className="mt-2 text-[11px] text-muted">
              <span className="font-medium text-foreground">RAG sources:</span> {rca.ragSources.join(", ")}
            </p>
          )}
        </Section>

        {/* Related historical incidents */}
        {rca.relatedIncidents.length > 0 && (
          <Section title="Similar past incidents">
            <div className="space-y-1">
              {rca.relatedIncidents.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-[11.5px]">
                  <span className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-muted">{r.id}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{r.title}</span>
                  <span className="shrink-0 text-muted">{Math.round(r.similarity * 100)}% match</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Recommended fix */}
        <Section title="Recommended fix">
          <p className="mb-2 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-foreground">
            <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            {rca.recommendedFix}
          </p>
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-[#0d1117]">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
              <span className="font-mono text-[11px] text-[#8b949e]">{rca.codeSnippet.filename}</span>
              <span className="text-[10px] uppercase tracking-wide text-[#8b949e]">{rca.codeSnippet.language}</span>
            </div>
            <pre className="overflow-x-auto scroll-thin p-3 text-[11.5px] leading-relaxed text-[#c9d1d9]">
              <code>{rca.codeSnippet.code}</code>
            </pre>
          </div>
        </Section>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {prNumber ? (
            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-medium text-emerald-500">
              <GitPullRequest className="h-3.5 w-3.5" /> PR #{prNumber} drafted
              <ExternalLink className="h-3 w-3" />
            </span>
          ) : (
            <button
              onClick={onGeneratePR}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-foreground hover:bg-accent-soft"
            >
              <GitPullRequest className="h-3.5 w-3.5" /> Generate Pull Request
            </button>
          )}
          <button
            onClick={onAsk}
            className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-foreground/[0.06]"
          >
            <Lightbulb className="h-3.5 w-3.5 text-accent" /> Ask Unify Intelli
          </button>
          <button
            onClick={onReanalyze}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Re-analyze
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      {children}
    </div>
  );
}

function ConfidenceBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="text-[10.5px] font-medium text-muted">Confidence</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-foreground/[0.1]">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10.5px] font-semibold text-accent">{pct}%</span>
    </div>
  );
}
