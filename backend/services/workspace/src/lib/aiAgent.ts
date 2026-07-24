/**
 * Thin client for the AI incident-agent service (/ai-agent FastAPI).
 *
 * The agent owns the provider integration (GitHub deployments/Actions), the ML
 * classifier and the RAG/memory pipeline. The workspace service calls it for
 * real deployment data and root-cause analyses, and persists the results.
 *
 * Every call degrades gracefully — if the agent is unreachable the caller gets
 * `null` and can fall back to whatever is already stored in Postgres.
 */

import { env } from "../../../../src/config/env.js";

const BASE = env.aiAgentUrl;
const TIMEOUT_MS = 20_000;

async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[ai-agent] ${path} -> ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[ai-agent] ${path} unreachable:`, (err as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface AgentDeployment {
  external_id: string;
  environment: string;
  status: string;
  commit_sha?: string;
  commit_message?: string;
  branch?: string;
  author?: string;
  version?: string;
  duration_sec?: number;
  logs_url?: string;
  triggered_at?: string;
  raw?: unknown;
}

export interface AgentRca {
  problem: string;
  category: string;
  confidence: number;
  root_cause: string;
  explanation: string;
  suggested_fix: string;
  code_snippet?: { filename: string; language: string; code: string } | null;
  tools_used: string[];
  similar_incidents: unknown[];
  rag_grounded: boolean;
}

/** Fetch real deployments for owner/repo from the provider via the agent. */
export function fetchDeployments(owner: string, repo: string) {
  return call<{ deployments: AgentDeployment[] }>(
    `/deployments?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
  );
}

/** Run the full incident analysis pipeline for a failed deployment. */
export function analyzeIncident(payload: {
  error: string;
  owner: string;
  repo: string;
  deployment?: unknown;
}) {
  return call<AgentRca>("/analyze", { method: "POST", body: JSON.stringify(payload) });
}

/** Ask the agent to (re)index a repository into RAG memory. */
export function indexRepository(owner: string, repo: string) {
  return call<{ indexed: boolean }>("/index-repo", {
    method: "POST",
    body: JSON.stringify({ owner, repo }),
  });
}
