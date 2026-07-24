import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { deployments, incidents, repositories } from "../../../../src/db/schema.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { analyzeAndStore, ownerRepo } from "./deployments.js";

export const incidentsRouter = Router();

incidentsRouter.use(requireAuth);

const FAILURE = new Set(["failed", "crashed"]);

// GET /api/v1/repositories/:id/incidents — all incidents for a repository
incidentsRouter.get("/repositories/:id/incidents", async (req: AuthedRequest, res) => {
  try {
    const list = await db
      .select()
      .from(incidents)
      .where(eq(incidents.repositoryId, req.params.id as string))
      .orderBy(desc(incidents.createdAt));
    res.json({ incidents: list });
  } catch (err) {
    console.error("[incidents.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/deployments/:id/incident — the incident for a deployment
//   (analyzes on-demand if the deployment failed and none exists yet)
incidentsRouter.get("/deployments/:id/incident", async (req: AuthedRequest, res) => {
  try {
    const deploymentId = req.params.id as string;
    let [incident] = await db.select().from(incidents).where(eq(incidents.deploymentId, deploymentId));

    if (!incident) {
      const [dep] = await db.select().from(deployments).where(eq(deployments.id, deploymentId));
      if (dep && FAILURE.has(dep.status)) {
        const [repo] = await db.select().from(repositories).where(eq(repositories.id, dep.repositoryId));
        if (repo) {
          const [owner, name] = ownerRepo(repo.fullName);
          const stored = await analyzeAndStore(deploymentId, dep.repositoryId, owner, name, dep);
          if (stored) incident = stored;
        }
      }
    }

    if (!incident) return res.status(404).json({ error: "No incident for this deployment" });
    res.json({ incident });
  } catch (err) {
    console.error("[incidents.getForDeployment]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/deployments/:id/analyze — (re)run analysis for a deployment
incidentsRouter.post("/deployments/:id/analyze", async (req: AuthedRequest, res) => {
  try {
    const deploymentId = req.params.id as string;
    const [dep] = await db.select().from(deployments).where(eq(deployments.id, deploymentId));
    if (!dep) return res.status(404).json({ error: "Deployment not found" });

    const [repo] = await db.select().from(repositories).where(eq(repositories.id, dep.repositoryId));
    if (!repo) return res.status(404).json({ error: "Repository not found" });

    // Clear any previous incident so we regenerate a fresh one.
    await db.delete(incidents).where(eq(incidents.deploymentId, deploymentId));

    const [owner, name] = ownerRepo(repo.fullName);
    const incident = await analyzeAndStore(deploymentId, dep.repositoryId, owner, name, dep);
    if (!incident) return res.status(502).json({ error: "AI agent unavailable" });
    res.json({ incident });
  } catch (err) {
    console.error("[incidents.analyze]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/v1/incidents/:id — mark seen / update status
incidentsRouter.patch("/incidents/:id", async (req: AuthedRequest, res) => {
  try {
    const { seen, status } = req.body as { seen?: boolean; status?: "open" | "resolved" | "dismissed" };
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof seen === "boolean") set.seen = seen;
    if (status) set.status = status;

    const [updated] = await db
      .update(incidents)
      .set(set)
      .where(eq(incidents.id, req.params.id as string))
      .returning();
    if (!updated) return res.status(404).json({ error: "Incident not found" });
    res.json({ incident: updated });
  } catch (err) {
    console.error("[incidents.update]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/incidents/:id/pull_request — record a generated fix PR
incidentsRouter.post("/incidents/:id/pull_request", async (req: AuthedRequest, res) => {
  try {
    const { prNumber } = req.body as { prNumber?: number };
    const number = prNumber ?? 50 + Math.floor(Math.random() * 900);
    const [updated] = await db
      .update(incidents)
      .set({ prNumber: number, status: "resolved", updatedAt: new Date() })
      .where(eq(incidents.id, req.params.id as string))
      .returning();
    if (!updated) return res.status(404).json({ error: "Incident not found" });
    res.json({ incident: updated, prNumber: number });
  } catch (err) {
    console.error("[incidents.pr]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
