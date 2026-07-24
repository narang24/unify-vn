// ─────────────────────────────────────────────────────────────────────────────
// Unify Intelli — incident-agent (frontend simulation)
//
// Mirrors the real `/ai-incident-agent` backend pipeline so the UX works
// end-to-end in this preview:
//   1. ML classifier predicts the incident category (+ confidence)
//   2. the agent runs the appropriate tools (logs, metrics, k8s, github,
//      repo structure, execution paths, prior incidents)
//   3. RAG retrieves relevant repository knowledge
//   4. a root-cause analysis + suggested fix / code snippet is produced
//
// The category set matches the backend's trained classifier
// (ml/data/incidents.csv).
// ─────────────────────────────────────────────────────────────────────────────

export type DeploymentStatus =
  | "queued"
  | "building"
  | "deploying"
  | "success"
  | "failed"
  | "crashed"
  | "rolled_back";

export type DeploymentEnvironment = "production" | "staging" | "preview";

export interface DeploymentIncident {
  /** short one-line signal, e.g. "api-gateway CrashLoopBackOff" */
  signal: string;
  logsExcerpt: string;
}

export interface Deployment {
  id: string;
  repoId: string;
  environment: DeploymentEnvironment;
  status: DeploymentStatus;
  commitSha: string;
  commitMessage: string;
  branch: string;
  author: string;
  triggeredAt: string;
  durationSec: number;
  version: string;
  incident?: DeploymentIncident | null;
}

export const INCIDENT_CATEGORIES = [
  "API Failure",
  "Authentication Failure",
  "CI/CD Failure",
  "Cache Failure",
  "Database Failure",
  "Deployment Failure",
  "Infrastructure Failure",
  "Kubernetes Failure",
  "Network Failure",
  "Performance Issue",
  "Security Issue",
] as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export interface IncidentClassification {
  category: IncidentCategory;
  confidence: number; // 0..1 (from classifier predict_proba)
}

export type AgentToolName =
  | "classify_incident"
  | "get_logs"
  | "get_metrics"
  | "get_kubernetes_status"
  | "get_recent_deployments"
  | "get_github_changes"
  | "scan_repository"
  | "build_execution_graph"
  | "retrieve_repository_knowledge"
  | "get_similar_incidents";

export interface AgentToolStep {
  tool: AgentToolName;
  label: string;
  detail: string;
}

export interface RelatedIncident {
  id: string;
  title: string;
  similarity: number; // 0..1
  resolution: string;
}

export interface CodeSnippet {
  filename: string;
  language: string;
  code: string;
}

export interface RootCauseAnalysis {
  deploymentId: string;
  classification: IncidentClassification;
  confidence: number; // overall confidence in the RCA
  rootCause: string;
  explanation: string;
  recommendedFix: string;
  codeSnippet: CodeSnippet;
  toolSteps: AgentToolStep[];
  relatedIncidents: RelatedIncident[];
  ragSources: string[];
  generatedAt: string;
}

// ─── Incident templates (deterministic, keyed by signal) ─────────────────────

interface IncidentTemplate {
  match: RegExp;
  category: IncidentCategory;
  confidence: number;
  signal: string;
  logsExcerpt: string;
  rootCause: string;
  explanation: string;
  recommendedFix: string;
  codeSnippet: CodeSnippet;
  tools: AgentToolName[];
  ragSources: string[];
  related: RelatedIncident[];
}

const TEMPLATES: IncidentTemplate[] = [
  {
    match: /crashloop|oom|memory|pod/i,
    category: "Kubernetes Failure",
    confidence: 0.93,
    signal: "api-gateway CrashLoopBackOff",
    logsExcerpt:
      "10:03 ERROR api-gateway exited code 137 (OOMKilled)\n10:03 WARN restarting container (attempt 5)\n10:04 ERROR readiness probe failed: connection refused",
    rootCause:
      "The api-gateway pod is being OOMKilled (exit code 137) and entering CrashLoopBackOff. The container memory limit (256Mi) is lower than the service's steady-state usage after the latest deploy.",
    explanation:
      "The classifier flagged this as a Kubernetes Failure. Metrics show memory at 87% and climbing before each restart; the k8s tool reports CrashLoopBackOff on api-gateway while auth-service and postgres stay Running. The last commit added an in-memory response cache without an eviction bound, pushing the container past its 256Mi limit, so the kubelet kills and restarts it in a loop.",
    recommendedFix:
      "Raise the container memory limit and bound the new cache. Set resources.limits.memory to 512Mi and cap the LRU cache size so it can't grow unboundedly.",
    codeSnippet: {
      filename: "k8s/api-gateway-deployment.yaml",
      language: "yaml",
      code: `resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"   # was 256Mi — OOMKilled under new cache load
    cpu: "500m"`,
    },
    tools: [
      "classify_incident",
      "get_metrics",
      "get_kubernetes_status",
      "get_github_changes",
      "build_execution_graph",
      "retrieve_repository_knowledge",
      "get_similar_incidents",
    ],
    ragSources: ["k8s/api-gateway-deployment.yaml", "src/cache/responseCache.ts", "README.md"],
    related: [
      { id: "inc_204", title: "auth-service OOMKilled after cache rollout", similarity: 0.91, resolution: "Raised memory limit to 512Mi + bounded cache" },
      { id: "inc_155", title: "CrashLoopBackOff on api-gateway", similarity: 0.78, resolution: "Fixed readiness probe timing" },
    ],
  },
  {
    match: /postgres|database|connection|ecconrefused|econnrefused|timeout/i,
    category: "Database Failure",
    confidence: 0.9,
    signal: "PostgreSQL ECONNREFUSED",
    logsExcerpt:
      "10:01 ERROR Database connection failed\n10:02 ERROR PostgreSQL ECONNREFUSED 10.0.4.12:5432\n10:02 ERROR pool exhausted: 20/20 connections in use",
    rootCause:
      "The service can't reach PostgreSQL (ECONNREFUSED) and the connection pool is exhausted. The latest migration renamed the DB host env var, so the pool connects to a stale address and never releases connections.",
    explanation:
      "Classified as a Database Failure. Logs show ECONNREFUSED to Postgres and an exhausted pool; the github-changes tool shows the deploy touched config/database.ts and the .env template. The DATABASE_URL host key was renamed but the runtime config still reads the old variable, so every request opens a connection that fails and is never returned to the pool.",
    recommendedFix:
      "Point the pool at the correct env var and add a connection timeout + release on error so a bad host can't exhaust the pool.",
    codeSnippet: {
      filename: "src/config/database.ts",
      language: "typescript",
      code: `export const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // was DB_HOST (renamed in migration)
  connectionTimeoutMillis: 5_000,
  max: 20,
});

pool.on("error", (err) => {
  logger.error("pg pool error", err);
});`,
    },
    tools: [
      "classify_incident",
      "get_logs",
      "get_github_changes",
      "scan_repository",
      "retrieve_repository_knowledge",
      "get_similar_incidents",
    ],
    ragSources: ["src/config/database.ts", ".env.example", "docs/migrations.md"],
    related: [
      { id: "inc_188", title: "PostgreSQL connection timeout after deployment", similarity: 0.88, resolution: "Corrected DATABASE_URL + pool timeout" },
    ],
  },
  {
    match: /500|api|http|endpoint|gateway 5/i,
    category: "API Failure",
    confidence: 0.86,
    signal: "API returning HTTP 500",
    logsExcerpt:
      "10:03 ERROR API returned 500 on POST /v1/orders\n10:03 ERROR TypeError: cannot read properties of undefined (reading 'id')\n10:03 ERROR unhandled rejection in orderController.create",
    rootCause:
      "POST /v1/orders throws a 500 because orderController.create reads req.user.id without a null check after the auth middleware ordering changed in the last commit, so unauthenticated requests reach the handler with an undefined user.",
    explanation:
      "Classified as an API Failure. The error-rate metric jumped to 41% right after deploy; the execution-graph tool traces the 500 to orderController.create → requireUser, and github-changes shows the auth middleware was moved after the router mount, so some routes now run before auth populates req.user.",
    recommendedFix:
      "Restore middleware ordering (auth before routes) and guard the handler against a missing user.",
    codeSnippet: {
      filename: "src/controllers/orderController.ts",
      language: "typescript",
      code: `export async function create(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const order = await orders.create({ userId: req.user.id, ...req.body });
  return res.status(201).json(order);
}`,
    },
    tools: [
      "classify_incident",
      "get_logs",
      "get_metrics",
      "build_execution_graph",
      "get_github_changes",
      "retrieve_repository_knowledge",
    ],
    ragSources: ["src/controllers/orderController.ts", "src/middleware/auth.ts", "src/routes/index.ts"],
    related: [
      { id: "inc_162", title: "500s on /orders after middleware refactor", similarity: 0.83, resolution: "Reordered auth middleware" },
    ],
  },
  {
    match: /build|ci|pipeline|lint|compile|npm|deploy failed/i,
    category: "CI/CD Failure",
    confidence: 0.84,
    signal: "Build failed in CI",
    logsExcerpt:
      "build ERROR Type error: Property 'kind' does not exist on type 'Space'\n build ERROR Command \"next build\" exited with 1\n deploy ABORTED image not produced",
    rootCause:
      "The production build fails typechecking — a type used by the board was changed but a consumer wasn't updated, so `next build` exits 1 and no image is produced, aborting the deploy.",
    explanation:
      "Classified as a CI/CD Failure. The deployment never became healthy because the build step failed; github-changes shows a shared type was edited while a dependent component still references the old shape. RAG surfaced the type definition and its consumers.",
    recommendedFix:
      "Update the consumer to the new type shape (or make the field optional) so the build typechecks.",
    codeSnippet: {
      filename: "src/lib/work-item-types.tsx",
      language: "typescript",
      code: `export type BoardKind = "kanban" | "scrum" | "bugtracker" | "custom";
// ensure every consumer handles the widened union, e.g.:
export function boardTypeLabel(kind: BoardKind) {
  return BOARD_TYPES.find((b) => b.value === kind)?.label ?? "Kanban";
}`,
    },
    tools: [
      "classify_incident",
      "get_recent_deployments",
      "get_github_changes",
      "scan_repository",
      "retrieve_repository_knowledge",
    ],
    ragSources: ["src/lib/work-item-types.tsx", "package.json", ".github/workflows/deploy.yml"],
    related: [
      { id: "inc_140", title: "next build type error blocked deploy", similarity: 0.8, resolution: "Fixed consumer type" },
    ],
  },
];

const FALLBACK: IncidentTemplate = TEMPLATES[0];

export function pickTemplate(signal: string): IncidentTemplate {
  return TEMPLATES.find((t) => t.match.test(signal)) ?? FALLBACK;
}

export function toolLabel(tool: AgentToolName): string {
  const map: Record<AgentToolName, string> = {
    classify_incident: "ML incident classifier",
    get_logs: "Application logs",
    get_metrics: "Runtime metrics",
    get_kubernetes_status: "Kubernetes state",
    get_recent_deployments: "Recent deployments",
    get_github_changes: "GitHub changes",
    scan_repository: "Repository structure",
    build_execution_graph: "Execution graph",
    retrieve_repository_knowledge: "RAG repository memory",
    get_similar_incidents: "Historical incident memory",
  };
  return map[tool];
}

// ─── Seeded deployment history (per repo) ────────────────────────────────────

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const AUTHORS = ["Vanshika", "Narang", "Rahul", "Priya"];
const SUCCESS_MSGS = [
  "feat: add avatar circles to board topbar",
  "chore: bump dependencies",
  "fix: calendar cell alignment",
  "refactor: extract work-item dialog",
  "perf: memoize board columns",
];

export function seedDeployments(repoId: string): Deployment[] {
  const base = hashString(repoId);
  const sha = () => (base + Math.floor(Math.random() * 1e6)).toString(16).slice(0, 7);

  const failTemplate = TEMPLATES[base % TEMPLATES.length];

  const list: Deployment[] = [
    {
      id: `dep_${repoId}_1`,
      repoId,
      environment: "production",
      status: "failed",
      commitSha: sha(),
      commitMessage: "feat: add response cache to api-gateway",
      branch: "main",
      author: AUTHORS[base % AUTHORS.length],
      triggeredAt: "12 minutes ago",
      durationSec: 84,
      version: "v1.8.0",
      incident: { signal: failTemplate.signal, logsExcerpt: failTemplate.logsExcerpt },
    },
    {
      id: `dep_${repoId}_2`,
      repoId,
      environment: "production",
      status: "success",
      commitSha: sha(),
      commitMessage: SUCCESS_MSGS[base % SUCCESS_MSGS.length],
      branch: "main",
      author: AUTHORS[(base + 1) % AUTHORS.length],
      triggeredAt: "3 hours ago",
      durationSec: 96,
      version: "v1.7.4",
    },
    {
      id: `dep_${repoId}_3`,
      repoId,
      environment: "staging",
      status: "success",
      commitSha: sha(),
      commitMessage: SUCCESS_MSGS[(base + 2) % SUCCESS_MSGS.length],
      branch: "develop",
      author: AUTHORS[(base + 2) % AUTHORS.length],
      triggeredAt: "yesterday",
      durationSec: 72,
      version: "v1.7.3",
    },
    {
      id: `dep_${repoId}_4`,
      repoId,
      environment: "production",
      status: "rolled_back",
      commitSha: sha(),
      commitMessage: "feat: new pricing engine",
      branch: "main",
      author: AUTHORS[(base + 3) % AUTHORS.length],
      triggeredAt: "2 days ago",
      durationSec: 120,
      version: "v1.7.2",
    },
    {
      id: `dep_${repoId}_5`,
      repoId,
      environment: "production",
      status: "success",
      commitSha: sha(),
      commitMessage: SUCCESS_MSGS[(base + 4) % SUCCESS_MSGS.length],
      branch: "main",
      author: AUTHORS[(base + 1) % AUTHORS.length],
      triggeredAt: "3 days ago",
      durationSec: 88,
      version: "v1.7.1",
    },
  ];
  return list;
}

export function isFailure(status: DeploymentStatus): boolean {
  return status === "failed" || status === "crashed";
}

// ─── Simulated agent run (classify → tools → RAG → RCA) ──────────────────────

export function runIncidentAgent(deployment: Deployment): Promise<RootCauseAnalysis> {
  const template = pickTemplate(deployment.incident?.signal ?? "");
  const rca: RootCauseAnalysis = {
    deploymentId: deployment.id,
    classification: { category: template.category, confidence: template.confidence },
    confidence: Math.min(0.97, template.confidence + 0.02),
    rootCause: template.rootCause,
    explanation: template.explanation,
    recommendedFix: template.recommendedFix,
    codeSnippet: template.codeSnippet,
    toolSteps: template.tools.map((t) => ({ tool: t, label: toolLabel(t), detail: toolDetail(t) })),
    relatedIncidents: template.related,
    ragSources: template.ragSources,
    generatedAt: "just now",
  };
  // Simulate the multi-step pipeline latency.
  return new Promise((resolve) => setTimeout(() => resolve(rca), 1600));
}

function toolDetail(tool: AgentToolName): string {
  const map: Record<AgentToolName, string> = {
    classify_incident: "Predicted incident category from logs + signal",
    get_logs: "Pulled recent error logs",
    get_metrics: "CPU / memory / latency / error-rate snapshot",
    get_kubernetes_status: "Pod & container status across the namespace",
    get_recent_deployments: "Correlated with the failing deploy",
    get_github_changes: "Files changed in the latest commit",
    scan_repository: "Located relevant modules & manifests",
    build_execution_graph: "Traced call paths to the failure point",
    retrieve_repository_knowledge: "Semantic search over repository memory",
    get_similar_incidents: "Matched against resolved historical incidents",
  };
  return map[tool];
}
