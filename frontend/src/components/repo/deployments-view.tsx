"use client";

import * as React from "react";
import {
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Loader2,
  RotateCcw,
  Rocket,
  Sparkles,
  Search,
  Database,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIncidents } from "@/lib/incident-context";
import { isFailure, type Deployment, type DeploymentStatus, type RootCauseAnalysis } from "@/lib/incident-agent";
import type { ConnectedRepository } from "@/lib/repo-types";
import { InvestigatePanel } from "@/components/repo/investigate-panel";
import { PrDraftModal } from "@/components/repo/pr-draft-modal";
import type { PrDraft } from "@/lib/incident-agent";

const STATUS: Record<DeploymentStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  queued:      { label: "Queued",      icon: Clock,        className: "text-muted" },
  building:    { label: "Building",    icon: Loader2,      className: "text-amber-500" },
  deploying:   { label: "Deploying",   icon: Loader2,      className: "text-amber-500" },
  success:     { label: "Success",     icon: CheckCircle2, className: "text-emerald-500" },
  failed:      { label: "Failed",      icon: XCircle,      className: "text-danger" },
  crashed:     { label: "Crashed",     icon: AlertOctagon, className: "text-danger" },
  rolled_back: { label: "Rolled back", icon: RotateCcw,    className: "text-amber-500" },
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

  // Investigate panel state
  const [panelDepId, setPanelDepId] = React.useState<string | null>(null);

  // PR Draft modal state
  const [prModalOpen, setPrModalOpen] = React.useState(false);
  const [prDraftLoading, setPrDraftLoading] = React.useState(false);
  const [prDraft, setPrDraft] = React.useState<PrDraft | null>(null);
  const [prModalDepId, setPrModalDepId] = React.useState<string | null>(null);

  React.useEffect(() => {
    incidents.ensureRepo(repo.id);
  }, [repo.id, incidents]);

  // Mark recommendations seen once the user opens the deployments tab.
  React.useEffect(() => {
    const t = setTimeout(() => incidents.markSeen(repo.id), 500);
    return () => clearTimeout(t);
  }, [repo.id, incidents, state?.analyses]);

  const deployments = state?.deployments ?? [];

  // Derive the currently-investigated deployment + its analysis
  const panelDep     = panelDepId ? deployments.find((d) => d.id === panelDepId) ?? null : null;
  const panelRca     = panelDepId ? state?.analyses[panelDepId] ?? null : null;
  const panelAnalyzing = panelDepId ? !!state?.analyzing.includes(panelDepId) : false;
  const panelPrNum   = panelDepId ? state?.prByDeployment[panelDepId] : undefined;

  // ── Generate PR from the panel action bar ────────────────────────────────
  function handleGeneratePR(depId: string) {
    setPrModalDepId(depId);
    setPrDraft(null);
    setPrDraftLoading(true);
    setPrModalOpen(true);
    incidents.draftPullRequest(repo.id, depId).then((draft) => {
      setPrDraft(draft);
      setPrDraftLoading(false);
    }).catch(() => {
      setPrDraftLoading(false);
    });
  }

  return (
    <div className="h-full overflow-y-auto scroll-thin p-4 font-semibold">
      {/* Repository-memory status bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <IndexBadge state={state?.index ?? "idle"} />
        <p className="text-[12px] text-muted">
          Unify Intelli continuously indexes this repo and analyzes failed deployments automatically.
        </p>
        <button
          onClick={() => incidents.triggerDeployment(repo.id)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[12px] font-semibold text-foreground hover:bg-foreground/[0.06]"
        >
          <Rocket className="h-3.5 w-3.5" /> Sync deployments
        </button>
      </div>

      <div className="space-y-2">
        {deployments.map((dep) => {
          const analysis  = state?.analyses[dep.id];
          const analyzing = state?.analyzing.includes(dep.id);
          const failed    = isFailure(dep.status);
          return (
            <div key={dep.id} className="overflow-hidden rounded-xl border border-border-subtle bg-panel">
              <DeploymentRow
                dep={dep}
                failed={failed}
                analyzing={!!analyzing}
                hasAnalysis={!!analysis}
                onInvestigate={() => setPanelDepId(dep.id)}
              />
            </div>
          );
        })}

        {deployments.length === 0 && (
          <div className="rounded-xl border border-dashed border-border-subtle py-10 text-center">
            <p className="text-[13px] font-semibold text-foreground">No deployments yet.</p>
            <p className="mt-1 text-[12px] text-muted">Trigger a deployment to see its history and status here.</p>
          </div>
        )}
      </div>

      {/* ── Investigate right-side panel ─────────────────────────────── */}
      <InvestigatePanel
        open={!!panelDepId}
        onClose={() => setPanelDepId(null)}
        deployment={panelDep}
        rca={panelRca}
        analyzing={panelAnalyzing}
        prNumber={panelPrNum}
        onAskIntelli={(rca) => {
          setPanelDepId(null);
          onAskIntelli(rca);
        }}
        onReanalyze={() => {
          if (panelDepId) incidents.reanalyze(repo.id, panelDepId);
        }}
        onGeneratePR={() => {
          if (panelDepId) handleGeneratePR(panelDepId);
        }}
      />

      {/* ── PR Draft modal ────────────────────────────────────────────── */}
      <PrDraftModal
        open={prModalOpen}
        onOpenChange={setPrModalOpen}
        owner={repo.owner ?? repo.fullName?.split("/")[0] ?? "owner"}
        repo={repo.name}
        draft={prDraft}
        loading={prDraftLoading}
      />
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
  onInvestigate,
}: {
  dep: Deployment;
  failed: boolean;
  analyzing: boolean;
  hasAnalysis: boolean;
  onInvestigate: () => void;
}) {
  const s = STATUS[dep.status];
  const Icon = s.icon;
  const spinning = dep.status === "building" || dep.status === "deploying";

  return (
    <div className="flex w-full items-center gap-3 px-3.5 py-3">
      <Icon className={cn("h-4 w-4 shrink-0", s.className, spinning && "animate-spin")} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-semibold text-foreground">{dep.commitMessage}</p>
          <span className="shrink-0 rounded bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-muted">
            {dep.environment}
          </span>
          {failed && (
            analyzing ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/12 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Analyzing
              </span>
            ) : hasAnalysis ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/12 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                <Sparkles className="h-2.5 w-2.5" /> Suggestion ready
              </span>
            ) : null
          )}
        </div>
        <p className="mt-0.5 truncate text-[11.5px] text-muted">
          {dep.version} · {s.label} · {dep.commitSha} · {dep.branch} · {dep.triggeredAt} by {dep.author} · {dep.durationSec}s
        </p>
      </div>

      {/* Investigate button — only on failed deployments */}
      {failed && (
        <button
          id={`investigate-btn-${dep.id}`}
          onClick={onInvestigate}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
            hasAnalysis
              ? "bg-danger/10 text-danger hover:bg-danger/15"
              : "border border-border-subtle text-muted hover:bg-foreground/[0.06] hover:text-foreground",
          )}
          aria-label={`Investigate failed deployment: ${dep.commitMessage}`}
        >
          <Search className="h-3.5 w-3.5" />
          Investigate
        </button>
      )}
    </div>
  );
}
