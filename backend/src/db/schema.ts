import { pgTable, text, timestamp, uuid, integer, boolean, jsonb, doublePrecision } from "drizzle-orm/pg-core";

// Default board columns applied to every new space.
export const DEFAULT_BOARD_COLUMNS = [
  { id: "todo", label: "To Do" },
  { id: "inprogress", label: "In Progress" },
  { id: "inreview", label: "In Review" },
  { id: "done", label: "Done" },
] as const;

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),          // null for OAuth-only users
  authProvider: text("auth_provider")
    .$type<"local" | "google" | "github" | "gitlab">()
    .notNull()
    .default("local"),
  providerAccountId: text("provider_account_id"), // provider's user ID for OAuth
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),       // SHA-256 hash of the opaque token
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Workspaces ───────────────────────────────────────────────────────────────

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Spaces ───────────────────────────────────────────────────────────────────
// A space is a single board container. `kind` decides which views are
// available on the frontend: "kanban" → Board only, "scrum" → Board + Backlog.

export type BoardColumn = { id: string; label: string };

export const spaces = pgTable("spaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind")
    .$type<"kanban" | "scrum" | "bugtracker" | "custom">()
    .notNull()
    .default("kanban"),
  // Board statuses (custom columns) live on the space itself.
  columns: jsonb("columns").$type<BoardColumn[]>().notNull().default([...DEFAULT_BOARD_COLUMNS]),
  pinned: boolean("pinned").notNull().default(false),
  // A space can be linked to a connected repository.
  repositoryId: uuid("repository_id").references(() => repositories.id, { onDelete: "set null" }),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Sprints ──────────────────────────────────────────────────────────────────
// Sprints only apply to scrum spaces; a work item's sprintId is null while
// it lives in the backlog and set once it's pulled into an active/planned sprint.

export const sprints = pgTable("sprints", {
  id: uuid("id").defaultRandom().primaryKey(),
  spaceId: uuid("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status")
    .$type<"planned" | "active" | "completed">()
    .notNull()
    .default("planned"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Work Items ───────────────────────────────────────────────────────────────

export type WorkItemAttachment = { id: string; name: string; meta?: string };

export const workItems = pgTable("work_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  spaceId: uuid("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  sprintId: uuid("sprint_id").references(() => sprints.id, { onDelete: "set null" }),
  // Subtasks reference their parent epic/story/task/bug via parentId.
  parentId: uuid("parent_id"),
  // A work item may be attached to an epic (separate from parentId).
  epicId: uuid("epic_id"),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type")
    .$type<"epic" | "story" | "task" | "subtask" | "bug">()
    .notNull()
    .default("task"),
  status: text("status").notNull().default("todo"), // matches the space's column ids
  label: text("label"),
  assignee: text("assignee"),                 // free-text initials/name from the UI
  assigneeId: uuid("assignee_id").references(() => users.id),
  attachments: jsonb("attachments").$type<WorkItemAttachment[]>().notNull().default([]),
  dueDate: timestamp("due_date"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Repositories ─────────────────────────────────────────────────────────────
// A connected GitHub/GitLab repository. Deployments & incidents hang off it.

export const repositories = pgTable("repositories", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),                      // e.g. "TravelStory-VN"
  fullName: text("full_name").notNull(),             // e.g. "narang24/TravelStory-VN"
  provider: text("provider").$type<"github" | "gitlab">().notNull().default("github"),
  defaultBranch: text("default_branch").notNull().default("main"),
  htmlUrl: text("html_url"),
  avatarColor: text("avatar_color").notNull().default("#3a93b1"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Deployments ──────────────────────────────────────────────────────────────
// Real deployments synced from the provider (GitHub Deployments / Actions).

export const deployments = pgTable("deployments", {
  id: uuid("id").defaultRandom().primaryKey(),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  externalId: text("external_id"),                   // provider deployment / run id
  environment: text("environment").notNull().default("production"),
  status: text("status")
    .$type<"queued" | "building" | "deploying" | "success" | "failed" | "crashed" | "rolled_back">()
    .notNull()
    .default("queued"),
  commitSha: text("commit_sha"),
  commitMessage: text("commit_message"),
  branch: text("branch"),
  author: text("author"),
  version: text("version"),
  durationSec: integer("duration_sec"),
  logsUrl: text("logs_url"),
  raw: jsonb("raw"),                                 // full provider payload
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Incidents (AI root-cause analyses) ────────────────────────────────────────

export type IncidentCodeSnippet = { filename: string; language: string; code: string };

export const incidents = pgTable("incidents", {
  id: uuid("id").defaultRandom().primaryKey(),
  deploymentId: uuid("deployment_id").notNull().references(() => deployments.id, { onDelete: "cascade" }),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  category: text("category"),
  confidence: doublePrecision("confidence"),
  rootCause: text("root_cause"),
  explanation: text("explanation"),
  suggestedFix: text("suggested_fix"),
  codeSnippet: jsonb("code_snippet").$type<IncidentCodeSnippet | null>(),
  toolsUsed: jsonb("tools_used").$type<string[]>().notNull().default([]),
  similarIncidents: jsonb("similar_incidents").$type<unknown[]>().notNull().default([]),
  ragSources: jsonb("rag_sources").$type<string[]>().notNull().default([]),
  status: text("status").$type<"open" | "resolved" | "dismissed">().notNull().default("open"),
  prNumber: integer("pr_number"),
  seen: boolean("seen").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type Space = typeof spaces.$inferSelect;
export type NewSpace = typeof spaces.$inferInsert;
export type Sprint = typeof sprints.$inferSelect;
export type NewSprint = typeof sprints.$inferInsert;
export type WorkItem = typeof workItems.$inferSelect;
export type NewWorkItem = typeof workItems.$inferInsert;
export type Repository = typeof repositories.$inferSelect;
export type NewRepository = typeof repositories.$inferInsert;
export type Deployment = typeof deployments.$inferSelect;
export type NewDeployment = typeof deployments.$inferInsert;
export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;
