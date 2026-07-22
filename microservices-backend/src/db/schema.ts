import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";

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

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),       // SHA-256 hash of the opaque token
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// A space is a single board container. `kind` decides which views are
// available on the frontend: "kanban" -> Board only, "scrum" -> Board + Backlog.
export const spaces = pgTable("spaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind").$type<"kanban" | "scrum">().notNull().default("kanban"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sprints only apply to scrum spaces; a work item's sprintId is null while
// it lives in the backlog and set once it's pulled into an active/planned sprint.
export const sprints = pgTable("sprints", {
  id: uuid("id").defaultRandom().primaryKey(),
  spaceId: uuid("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status").$type<"planned" | "active" | "completed">().notNull().default("planned"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workItems = pgTable("work_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  spaceId: uuid("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  sprintId: uuid("sprint_id").references(() => sprints.id, { onDelete: "set null" }),
  // Subtasks reference their parent epic/story/task/bug via parentId.
  parentId: uuid("parent_id"),
  title: text("title").notNull(),
  type: text("type").$type<"epic" | "story" | "task" | "subtask" | "bug">().notNull().default("task"),
  status: text("status").notNull().default("todo"), // todo | inprogress | inreview | done
  assigneeId: uuid("assignee_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Space = typeof spaces.$inferSelect;
export type Sprint = typeof sprints.$inferSelect;
export type WorkItem = typeof workItems.$inferSelect;
export type NewWorkItem = typeof workItems.$inferInsert;
