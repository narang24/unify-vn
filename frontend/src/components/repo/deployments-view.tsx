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
  Bot,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useIncidents } from "@/lib/incident-context";
import { isFailure, type Deployment, type DeploymentStatus, type RootCauseAnalysis } from "@/lib/incident-agent";
import type { ConnectedRepository, ContextChip } from "@/lib/repo-types";
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
  selectMode,
  selectedChips = [],
  onAddChip,
  onRemoveChip,
  onAskIntelli,
}: {
  repo: ConnectedRepository;
  selectMode?: boolean;
  selectedChips?: ContextChip[];
  onAddChip?: (c: ContextChip) => void;
  onRemoveChip?: (id: string) => void;
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
      {/* Repository-memory status bar / Explanation Box */}
      <div className="mb-5 rounded-lg border border-border-subtle bg-panel-strong/20 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/unify-intelli-icon.png"
              alt="Unify Intelli"
              width={32}
              height={32}
              className="rounded-md"
            />
            <h3 className="text-[14px] font-semibold text-foreground">Unify Intelli Deployment Analysis</h3>
          </div>
          <button
            onClick={() => incidents.triggerDeployment(repo.id)}
            className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[12px] font-semibold text-foreground hover:bg-foreground/[0.06]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Sync
          </button>
        </div>
        <p className="mb-4 text-[12.5px] font-medium text-muted">
          Our AI agent automatically monitors your deployments, analyzes crashes, and suggests fixes by referencing your repository's code context.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-accent/80">
          <span className="rounded-md bg-accent/10 px-2 py-1">Detect Failure</span>
          <ChevronRight className="h-3 w-3 text-accent/50" />
          <span className="rounded-md bg-accent/10 px-2 py-1">Index Repository</span>
          <ChevronRight className="h-3 w-3 text-accent/50" />
          <span className="rounded-md bg-accent/10 px-2 py-1">Analyze Logs & Code</span>
          <ChevronRight className="h-3 w-3 text-accent/50" />
          <span className="rounded-md bg-accent/20 px-2 py-1 text-accent">Suggest Fix & Generate PR</span>
        </div>
      </div>

      <div className="space-y-2">
        {deployments.map((dep) => {
          const analysis  = state?.analyses[dep.id];
          const analyzing = state?.analyzing.includes(dep.id);
          const failed    = isFailure(dep.status);
          const chipId    = `ctx_deploy_${dep.id}`;
          const isSelected = selectedChips.some((x) => x.id === chipId);

          return (
            <div key={dep.id} className={cn("overflow-hidden rounded-xl border border-border-subtle bg-panel", selectMode && isSelected && "bg-accent/5 border-accent/20")}>
              <DeploymentRow
                dep={dep}
                failed={failed}
                analyzing={!!analyzing}
                hasAnalysis={!!analysis}
                onInvestigate={() => setPanelDepId(dep.id)}
                selectMode={selectMode}
                isSelected={isSelected}
                onSelectToggle={(checked) => {
                  if (checked) {
                    onAddChip?.({
                      id: chipId,
                      type: "code",
                      label: `Deploy: ${dep.version}`,
                      meta: `${dep.commitMessage}\nEnvironment: ${dep.environment}\nStatus: ${dep.status}`,
                    });
                  } else {
                    onRemoveChip?.(chipId);
                  }
                }}
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
  selectMode,
  isSelected,
  onSelectToggle,
}: {
  dep: Deployment;
  failed: boolean;
  analyzing: boolean;
  hasAnalysis: boolean;
  onInvestigate: () => void;
  selectMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (selected: boolean) => void;
}) {
  const s = STATUS[dep.status];
  const Icon = s.icon;
  const spinning = dep.status === "building" || dep.status === "deploying";

  return (
    <div className="flex w-full items-center gap-3 px-3.5 py-3">
      {selectMode && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelectToggle}
          className="mr-1"
        />
      )}
      <Icon className={cn("h-4 w-4 shrink-0", s.className, spinning && "animate-spin")} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-semibold text-foreground">{dep.commitMessage}</p>
          <span className="shrink-0 rounded bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-muted">
            {dep.environment}
          </span>
          {failed && analyzing && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/12 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Analyzing
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11.5px] text-muted">
          {dep.version} · {s.label} · {dep.commitSha} · {dep.branch} · {dep.triggeredAt} by {dep.author} · {dep.durationSec}s
        </p>
      </div>

      {/* Investigate button — only shown once AI analysis is ready */}
      {failed && hasAnalysis && (
        <button
          id={`investigate-btn-${dep.id}`}
          onClick={onInvestigate}
          className="flex shrink-0 items-center rounded-lg bg-[#16606a] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#0f4a52]"
          aria-label={`Investigate failed deployment: ${dep.commitMessage}`}
        >
          Investigate
        </button>
      )}
    </div>
  );
}
