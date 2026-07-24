"use client";

import * as React from "react";
import {
  seedDeployments,
  runIncidentAgent,
  isFailure,
  type Deployment,
  type DeploymentStatus,
  type RootCauseAnalysis,
  type AgentToolStep,
  type AgentToolName,
} from "@/lib/incident-agent";
import {
  listDeployments,
  syncDeployments,
  getIncidentForDeployment,
  analyzeDeployment,
  generatePullRequest as apiGeneratePr,
  markIncidentSeen,
  type ApiDeployment,
  type ApiIncident,
} from "@/lib/api";
import { toast } from "@/lib/use-toast";

type IndexState = "idle" | "indexing" | "ready";

interface RepoIncidentState {
  deployments: Deployment[];
  analyses: Record<string, RootCauseAnalysis>;
  incidentIds: Record<string, string>;   // deploymentId → incident id (for PR / seen)
  analyzing: string[];
  index: IndexState;
  seen: boolean;
  prByDeployment: Record<string, number>;
  live: boolean;                          // true when data came from the backend
}

interface IncidentContextValue {
  ensureRepo: (repoId: string) => void;
  getState: (repoId: string) => RepoIncidentState | undefined;
  hasNewRecommendation: (repoId: string) => boolean;
  markSeen: (repoId: string) => void;
  reanalyze: (repoId: string, deploymentId: string) => void;
  triggerDeployment: (repoId: string) => void;   // → sync from provider
  generatePullRequest: (repoId: string, deploymentId: string) => void;
}

const IncidentContext = React.createContext<IncidentContextValue | null>(null);

const EMPTY: RepoIncidentState = {
  deployments: [],
  analyses: {},
  incidentIds: {},
  analyzing: [],
  index: "idle",
  seen: true,
  prByDeployment: {},
  live: false,
};

// ─── Mappers: backend shapes → frontend view models ──────────────────────────

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return iso;
  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)} minutes ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} hours ago`;
  return `${Math.floor(secs / 86400)} days ago`;
}

function mapDeployment(d: ApiDeployment): Deployment {
  return {
    id: d.id,
    repoId: d.repositoryId,
    environment: (d.environment as Deployment["environment"]) ?? "production",
    status: d.status as DeploymentStatus,
    commitSha: d.commitSha ?? "",
    commitMessage: d.commitMessage ?? "(no message)",
    branch: d.branch ?? "main",
    author: d.author ?? "unknown",
    triggeredAt: relativeTime(d.triggeredAt),
    durationSec: d.durationSec ?? 0,
    version: d.version ?? "",
    incident: isFailure(d.status as DeploymentStatus)
      ? { signal: d.commitMessage ?? d.status, logsExcerpt: "" }
      : null,
  };
}

function prettyTool(name: string): AgentToolStep {
  const label = name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { tool: name as AgentToolName, label, detail: name };
}

function mapIncident(inc: ApiIncident): RootCauseAnalysis {
  return {
    deploymentId: inc.deploymentId,
    classification: {
      category: (inc.category ?? "Unknown") as RootCauseAnalysis["classification"]["category"],
      confidence: inc.confidence ?? 0,
    },
    confidence: inc.confidence ?? 0,
    rootCause: inc.rootCause ?? "",
    explanation: inc.explanation ?? "",
    recommendedFix: inc.suggestedFix ?? "",
    codeSnippet: inc.codeSnippet ?? { filename: "", language: "", code: "" },
    toolSteps: (inc.toolsUsed ?? []).map(prettyTool),
    relatedIncidents: (inc.similarIncidents ?? []).map((s, i) => ({
      id: s.id ?? `inc_${i}`,
      title: s.category ?? s.root_cause ?? "Similar incident",
      similarity: s.similarity ?? 0,
      resolution: s.root_cause ?? "",
    })),
    ragSources: inc.ragSources ?? [],
    generatedAt: "just now",
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function IncidentProvider({
  repositories,
  children,
}: {
  repositories: { id: string }[];
  children: React.ReactNode;
}) {
  const [repos, setRepos] = React.useState<Record<string, RepoIncidentState>>({});
  const loadedRef = React.useRef<Set<string>>(new Set());

  /** Load real deployments + incidents for a repo from the backend. */
  const loadFromBackend = React.useCallback(async (repoId: string): Promise<boolean> => {
    let apiDeployments: ApiDeployment[];
    try {
      apiDeployments = await listDeployments(repoId, true);
    } catch {
      return false; // backend unreachable → caller falls back to simulation
    }

    const deployments = apiDeployments.map(mapDeployment);
    const analyses: Record<string, RootCauseAnalysis> = {};
    const incidentIds: Record<string, string> = {};
    const prByDeployment: Record<string, number> = {};
    let anyUnseen = false;

    // Fetch incidents for failed deployments (the backend analyzes on demand).
    await Promise.all(
      apiDeployments
        .filter((d) => isFailure(d.status as DeploymentStatus))
        .map(async (d) => {
          try {
            const inc = await getIncidentForDeployment(d.id);
            analyses[d.id] = mapIncident(inc);
            incidentIds[d.id] = inc.id;
            if (inc.prNumber) prByDeployment[d.id] = inc.prNumber;
            if (!inc.seen) anyUnseen = true;
          } catch {
            /* no incident yet */
          }
        }),
    );

    setRepos((prev) => ({
      ...prev,
      [repoId]: {
        deployments,
        analyses,
        incidentIds,
        analyzing: [],
        index: "ready",
        seen: !anyUnseen,
        prByDeployment,
        live: true,
      },
    }));
    return true;
  }, []);

  /** Fallback: local simulation (offline / backend down). */
  const loadSimulation = React.useCallback((repoId: string) => {
    const deployments = seedDeployments(repoId);
    setRepos((prev) => ({
      ...prev,
      [repoId]: { ...EMPTY, deployments, index: "indexing" },
    }));
    setTimeout(() => {
      setRepos((p) => (p[repoId] ? { ...p, [repoId]: { ...p[repoId], index: "ready" } } : p));
      deployments.filter((d) => isFailure(d.status)).forEach((dep) => {
        setRepos((p) => (p[repoId] ? { ...p, [repoId]: { ...p[repoId], analyzing: [...p[repoId].analyzing, dep.id] } } : p));
        runIncidentAgent(dep).then((rca) => {
          setRepos((p) => {
            const s = p[repoId];
            if (!s) return p;
            return {
              ...p,
              [repoId]: {
                ...s,
                analyzing: s.analyzing.filter((id) => id !== dep.id),
                analyses: { ...s.analyses, [dep.id]: rca },
                seen: false,
              },
            };
          });
        });
      });
    }, 1200);
  }, []);

  const ensureRepo = React.useCallback(
    (repoId: string) => {
      if (loadedRef.current.has(repoId)) return;
      loadedRef.current.add(repoId);
      setRepos((prev) => (prev[repoId] ? prev : { ...prev, [repoId]: { ...EMPTY, index: "indexing" } }));
      loadFromBackend(repoId).then((ok) => {
        if (!ok) loadSimulation(repoId);
      });
    },
    [loadFromBackend, loadSimulation],
  );

  React.useEffect(() => {
    repositories.forEach((r) => ensureRepo(r.id));
  }, [repositories, ensureRepo]);

  const value: IncidentContextValue = {
    ensureRepo,
    getState: (repoId) => repos[repoId],
    hasNewRecommendation: (repoId) => {
      const s = repos[repoId];
      if (!s || s.seen) return false;
      return s.deployments.some((d) => isFailure(d.status) && s.analyses[d.id]);
    },
    markSeen: (repoId) => {
      const s = repos[repoId];
      if (!s) return;
      if (s.live) Object.values(s.incidentIds).forEach((id) => markIncidentSeen(id).catch(() => {}));
      setRepos((prev) => (prev[repoId] ? { ...prev, [repoId]: { ...prev[repoId], seen: true } } : prev));
    },
    reanalyze: (repoId, deploymentId) => {
      const s = repos[repoId];
      if (!s) return;
      setRepos((prev) => ({ ...prev, [repoId]: { ...prev[repoId], analyzing: [...prev[repoId].analyzing, deploymentId] } }));
      const done = (rca: RootCauseAnalysis, incidentId?: string) =>
        setRepos((prev) => {
          const st = prev[repoId];
          if (!st) return prev;
          return {
            ...prev,
            [repoId]: {
              ...st,
              analyzing: st.analyzing.filter((id) => id !== deploymentId),
              analyses: { ...st.analyses, [deploymentId]: rca },
              incidentIds: incidentId ? { ...st.incidentIds, [deploymentId]: incidentId } : st.incidentIds,
            },
          };
        });

      if (s.live) {
        analyzeDeployment(deploymentId)
          .then((inc) => done(mapIncident(inc), inc.id))
          .catch(() => toast({ title: "Re-analysis failed", variant: "error" }));
      } else {
        const dep = s.deployments.find((d) => d.id === deploymentId);
        if (dep) runIncidentAgent(dep).then((rca) => done(rca));
      }
    },
    triggerDeployment: (repoId) => {
      const s = repos[repoId];
      if (s?.live) {
        toast({ title: "Syncing deployments…", description: "Pulling the latest from the provider." });
        syncDeployments(repoId)
          .then(() => {
            loadedRef.current.delete(repoId);
            loadFromBackend(repoId);
          })
          .catch(() => toast({ title: "Sync failed", variant: "error" }));
        return;
      }
      // Simulation-only manual trigger.
      const outcomes: DeploymentStatus[] = ["success", "success", "failed", "crashed"];
      const status = outcomes[Math.floor(Math.random() * outcomes.length)];
      const dep: Deployment = {
        id: `dep_${repoId}_${Date.now()}`,
        repoId,
        environment: "production",
        status,
        commitSha: Math.random().toString(16).slice(2, 9),
        commitMessage: "deploy: manual trigger",
        branch: "main",
        author: "You",
        triggeredAt: "just now",
        durationSec: 60 + Math.floor(Math.random() * 60),
        version: "v1.8.1",
        incident: isFailure(status) ? { signal: "api-gateway CrashLoopBackOff", logsExcerpt: "exit code 137 (OOMKilled)" } : null,
      };
      setRepos((prev) => ({ ...prev, [repoId]: { ...prev[repoId], deployments: [dep, ...(prev[repoId]?.deployments ?? [])] } }));
      if (isFailure(status)) {
        toast({ title: "Deployment failed", description: "Unify Intelli is analyzing…", variant: "error" });
        runIncidentAgent(dep).then((rca) =>
          setRepos((prev) => (prev[repoId] ? { ...prev, [repoId]: { ...prev[repoId], analyses: { ...prev[repoId].analyses, [dep.id]: rca }, seen: false } } : prev)),
        );
      }
    },
    generatePullRequest: (repoId, deploymentId) => {
      const s = repos[repoId];
      const incidentId = s?.incidentIds[deploymentId];
      const setPr = (n: number) =>
        setRepos((prev) => (prev[repoId] ? { ...prev, [repoId]: { ...prev[repoId], prByDeployment: { ...prev[repoId].prByDeployment, [deploymentId]: n } } } : prev));

      if (s?.live && incidentId) {
        apiGeneratePr(incidentId)
          .then(({ prNumber }) => {
            setPr(prNumber);
            toast({ title: "Pull request drafted", description: `#${prNumber} · fix from Unify Intelli`, variant: "success" });
          })
          .catch(() => toast({ title: "Couldn't draft PR", variant: "error" }));
      } else {
        const n = 50 + Math.floor(Math.random() * 900);
        setPr(n);
        toast({ title: "Pull request drafted", description: `#${n} · fix from Unify Intelli`, variant: "success" });
      }
    },
  };

  return <IncidentContext.Provider value={value}>{children}</IncidentContext.Provider>;
}

export function useIncidents(): IncidentContextValue {
  const ctx = React.useContext(IncidentContext);
  if (!ctx) {
    return {
      ensureRepo: () => {},
      getState: () => undefined,
      hasNewRecommendation: () => false,
      markSeen: () => {},
      reanalyze: () => {},
      triggerDeployment: () => {},
      generatePullRequest: () => {},
    };
  }
  return ctx;
}
