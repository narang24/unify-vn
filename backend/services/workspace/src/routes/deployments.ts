import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { deployments, incidents, repositories } from "../../../../src/db/schema.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { fetchDeployments, analyzeIncident, type AgentDeployment } from "../lib/aiAgent.js";

export const deploymentsRouter = Router();

deploymentsRouter.use(requireAuth);

const FAILURE = new Set(["failed", "crashed"]);

function ownerRepo(fullName: string): [string, string] {
  const [owner, ...rest] = fullName.split("/");
  return [owner ?? "", rest.join("/")];
}

/** Pull real deployments from the provider (via the agent) and upsert them.
 *  For any newly-failed deployment, trigger the AI analysis and store an incident. */
async function syncRepository(repoId: string): Promise<void> {
  const [repo] = await db.select().from(repositories).where(eq(repositories.id, repoId));
  if (!repo) return;

  const [owner, name] = ownerRepo(repo.fullName);
  if (!owner || !name) return;

  const agentResult = await fetchDeployments(owner, name);
  const incoming: AgentDeployment[] = agentResult?.deployments ?? [];
  if (incoming.length === 0) return;

  const existing = await db.select().from(deployments).where(eq(deployments.repositoryId, repoId));
  const byExternal = new Map(existing.map((d) => [d.externalId, d]));

  for (const d of incoming) {
    const status = (d.status ?? "queued") as NonNullable<typeof deployments.$inferInsert["status"]>;
    const prev = byExternal.get(d.external_id);

    let deploymentId: string;
    if (prev) {
      const [updated] = await db
        .update(deployments)
        .set({
          status,
          commitSha: d.commit_sha ?? prev.commitSha,
          commitMessage: d.commit_message ?? prev.commitMessage,
          durationSec: d.duration_sec ?? prev.durationSec,
        })
        .where(eq(deployments.id, prev.id))
        .returning();
      deploymentId = updated.id;
    } else {
      const [created] = await db
        .insert(deployments)
        .values({
          repositoryId: repoId,
          externalId: d.external_id,
          environment: d.environment ?? "production",
          status,
          commitSha: d.commit_sha ?? null,
          commitMessage: d.commit_message ?? null,
          branch: d.branch ?? null,
          author: d.author ?? null,
          version: d.version ?? null,
          durationSec: d.duration_sec ?? null,
          logsUrl: d.logs_url ?? null,
          raw: d.raw ?? null,
          triggeredAt: d.triggered_at ? new Date(d.triggered_at) : new Date(),
        })
        .returning();
      deploymentId = created.id;
    }

    // Auto-trigger Unify Intelli for failed/crashed deployments without an incident yet.
    if (FAILURE.has(status)) {
      const [hasIncident] = await db.select().from(incidents).where(eq(incidents.deploymentId, deploymentId));
      if (!hasIncident) {
        await analyzeAndStore(deploymentId, repoId, owner, name, d);
      }
    }
  }
}

async function analyzeAndStore(
  deploymentId: string,
  repoId: string,
  owner: string,
  name: string,
  deployment: unknown,
) {
  const error =
    (deployment as AgentDeployment)?.commit_message ??
    `Deployment failed for ${owner}/${name}`;
  const rca = await analyzeIncident({ error, owner, repo: name, deployment });
  if (!rca) return null;

  const [incident] = await db
    .insert(incidents)
    .values({
      deploymentId,
      repositoryId: repoId,
      category: rca.category,
      confidence: rca.confidence,
      rootCause: rca.root_cause,
      explanation: rca.explanation,
      suggestedFix: rca.suggested_fix,
      codeSnippet: rca.code_snippet ?? null,
      toolsUsed: rca.tools_used ?? [],
      similarIncidents: rca.similar_incidents ?? [],
      ragSources: [],
    })
    .returning();
  return incident;
}

// GET /api/v1/repositories/:id/deployments — list (optionally sync first with ?refresh=1)
deploymentsRouter.get("/repositories/:id/deployments", async (req: AuthedRequest, res) => {
  try {
    const repoId = req.params.id as string;

    const existing = await db.select().from(deployments).where(eq(deployments.repositoryId, repoId));
    if (existing.length === 0 || req.query.refresh === "1") {
      await syncRepository(repoId).catch((e) => console.error("[deployments.sync]", e));
    }

    const list = await db
      .select()
      .from(deployments)
      .where(eq(deployments.repositoryId, repoId))
      .orderBy(desc(deployments.triggeredAt));

    res.json({ deployments: list });
  } catch (err) {
    console.error("[deployments.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/repositories/:id/deployments/sync — force a provider sync
deploymentsRouter.post("/repositories/:id/deployments/sync", async (req: AuthedRequest, res) => {
  try {
    await syncRepository(req.params.id as string);
    const list = await db
      .select()
      .from(deployments)
      .where(eq(deployments.repositoryId, req.params.id as string))
      .orderBy(desc(deployments.triggeredAt));
    res.json({ deployments: list });
  } catch (err) {
    console.error("[deployments.sync]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { analyzeAndStore, ownerRepo };
