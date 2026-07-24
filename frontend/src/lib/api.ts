// ─────────────────────────────────────────────────────────────────────────────
// Typed API client for the Unify backend (real data).
// Every call goes through fetchWithAuth (JWT + refresh) and throws on non-2xx so
// callers can decide whether to surface an error or fall back to a local cache.
// ─────────────────────────────────────────────────────────────────────────────

import { fetchWithAuth } from "@/lib/auth";
import type { BoardColumn, BoardKind, WorkItemType, WorkItemAttachment } from "@/lib/work-item-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";
const V1 = `${API_BASE}/api/v1`;

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(`${V1}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${options.method ?? "GET"} ${path} → ${res.status}`);
  return (await res.json()) as T;
}

// ─── Server shapes (Drizzle returns camelCase keys) ──────────────────────────

export interface ApiWorkspace {
  id: string;
  name: string;
}

export interface ApiSpace {
  id: string;
  workspaceId: string;
  name: string;
  kind: BoardKind;
  columns: BoardColumn[];
  pinned: boolean;
  repositoryId: string | null;
  orderIndex: number;
}

export interface ApiWorkItem {
  id: string;
  spaceId: string;
  title: string;
  description: string | null;
  type: WorkItemType;
  status: string;
  label: string | null;
  assignee: string | null;
  epicId: string | null;
  attachments: WorkItemAttachment[];
  dueDate: string | null;
}

export interface ApiRepository {
  id: string;
  workspaceId: string;
  name: string;
  fullName: string;
  provider: "github" | "gitlab";
  defaultBranch: string;
  htmlUrl: string | null;
  avatarColor: string;
  orderIndex: number;
}

export interface ApiDeployment {
  id: string;
  repositoryId: string;
  externalId: string | null;
  environment: string;
  status: "queued" | "building" | "deploying" | "success" | "failed" | "crashed" | "rolled_back";
  commitSha: string | null;
  commitMessage: string | null;
  branch: string | null;
  author: string | null;
  version: string | null;
  durationSec: number | null;
  logsUrl: string | null;
  triggeredAt: string;
}

export interface ApiIncident {
  id: string;
  deploymentId: string;
  repositoryId: string;
  category: string | null;
  confidence: number | null;
  rootCause: string | null;
  explanation: string | null;
  suggestedFix: string | null;
  codeSnippet: { filename: string; language: string; code: string } | null;
  toolsUsed: string[];
  similarIncidents: { id?: string; category?: string; root_cause?: string; similarity?: number }[];
  ragSources: string[];
  status: "open" | "resolved" | "dismissed";
  prNumber: number | null;
  seen: boolean;
}

// ─── Workspaces ──────────────────────────────────────────────────────────────
export const listWorkspaces = () => req<{ workspaces: ApiWorkspace[] }>("/workspaces").then((r) => r.workspaces);
export const createWorkspace = (name: string) =>
  req<{ workspace: ApiWorkspace }>("/workspaces", { method: "POST", body: JSON.stringify({ name }) }).then((r) => r.workspace);

// ─── Spaces ──────────────────────────────────────────────────────────────────
export const listSpaces = (workspaceId: string) =>
  req<{ spaces: ApiSpace[] }>(`/workspaces/${workspaceId}/spaces`).then((r) => r.spaces);
export const createSpace = (workspaceId: string, body: { name: string; kind: BoardKind }) =>
  req<{ space: ApiSpace }>(`/workspaces/${workspaceId}/spaces`, { method: "POST", body: JSON.stringify(body) }).then((r) => r.space);
export const updateSpace = (id: string, patch: Partial<Pick<ApiSpace, "name" | "kind" | "columns" | "pinned" | "repositoryId" | "orderIndex">>) =>
  req<{ space: ApiSpace }>(`/spaces/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).then((r) => r.space);
export const deleteSpace = (id: string) => req<{ message: string }>(`/spaces/${id}`, { method: "DELETE" });
export const addSpaceColumn = (id: string, label: string) =>
  req<{ space: ApiSpace }>(`/spaces/${id}/columns`, { method: "POST", body: JSON.stringify({ label }) }).then((r) => r.space);
export const reorderSpaces = (workspaceId: string, orderedIds: string[]) =>
  req(`/workspaces/${workspaceId}/spaces/reorder`, { method: "POST", body: JSON.stringify({ orderedIds }) });

// ─── Work items ──────────────────────────────────────────────────────────────
export const listWorkItems = (spaceId: string) =>
  req<{ workItems: ApiWorkItem[] }>(`/spaces/${spaceId}/work_items`).then((r) => r.workItems);
export const createWorkItem = (spaceId: string, body: Partial<ApiWorkItem>) =>
  req<{ workItem: ApiWorkItem }>(`/spaces/${spaceId}/work_items`, { method: "POST", body: JSON.stringify(body) }).then((r) => r.workItem);
export const updateWorkItem = (id: string, patch: Partial<ApiWorkItem>) =>
  req<{ workItem: ApiWorkItem }>(`/work_items/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).then((r) => r.workItem);
export const deleteWorkItem = (id: string) => req<{ message: string }>(`/work_items/${id}`, { method: "DELETE" });

// ─── Repositories ────────────────────────────────────────────────────────────
export const listRepositories = (workspaceId: string) =>
  req<{ repositories: ApiRepository[] }>(`/workspaces/${workspaceId}/repositories`).then((r) => r.repositories);
export const createRepository = (workspaceId: string, body: Partial<ApiRepository>) =>
  req<{ repository: ApiRepository }>(`/workspaces/${workspaceId}/repositories`, { method: "POST", body: JSON.stringify(body) }).then((r) => r.repository);
export const deleteRepository = (id: string) => req<{ message: string }>(`/repositories/${id}`, { method: "DELETE" });
export const reorderRepositories = (workspaceId: string, orderedIds: string[]) =>
  req(`/workspaces/${workspaceId}/repositories/reorder`, { method: "POST", body: JSON.stringify({ orderedIds }) });

// ─── Deployments ─────────────────────────────────────────────────────────────
export const listDeployments = (repositoryId: string, refresh = false) =>
  req<{ deployments: ApiDeployment[] }>(`/repositories/${repositoryId}/deployments${refresh ? "?refresh=1" : ""}`).then((r) => r.deployments);
export const syncDeployments = (repositoryId: string) =>
  req<{ deployments: ApiDeployment[] }>(`/repositories/${repositoryId}/deployments/sync`, { method: "POST" }).then((r) => r.deployments);

// ─── Incidents ───────────────────────────────────────────────────────────────
export const listIncidents = (repositoryId: string) =>
  req<{ incidents: ApiIncident[] }>(`/repositories/${repositoryId}/incidents`).then((r) => r.incidents);
export const getIncidentForDeployment = (deploymentId: string) =>
  req<{ incident: ApiIncident }>(`/deployments/${deploymentId}/incident`).then((r) => r.incident);
export const analyzeDeployment = (deploymentId: string) =>
  req<{ incident: ApiIncident }>(`/deployments/${deploymentId}/analyze`, { method: "POST" }).then((r) => r.incident);
export const generatePullRequest = (incidentId: string) =>
  req<{ incident: ApiIncident; prNumber: number }>(`/incidents/${incidentId}/pull_request`, { method: "POST" });
export const markIncidentSeen = (incidentId: string) =>
  req<{ incident: ApiIncident }>(`/incidents/${incidentId}`, { method: "PATCH", body: JSON.stringify({ seen: true }) });
