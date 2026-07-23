import { Bug, Layers, BookMarked, CheckSquare, ListTree, Kanban, RefreshCw, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WorkItemType = "epic" | "story" | "task" | "subtask" | "bug";

export interface WorkItemTypeConfig {
  value: WorkItemType;
  label: string;
  icon: LucideIcon;
  color: string; // text/icon color
  bg: string; // soft background for chips
}

export const WORK_ITEM_TYPES: Record<WorkItemType, WorkItemTypeConfig> = {
  epic: {
    value: "epic",
    label: "Epic",
    icon: Layers,
    color: "#7c5cff",
    bg: "rgba(124,92,255,0.12)",
  },
  story: {
    value: "story",
    label: "Story",
    icon: BookMarked,
    color: "#1f9d6f",
    bg: "rgba(31,157,111,0.12)",
  },
  task: {
    value: "task",
    label: "Task",
    icon: CheckSquare,
    color: "#3a93b1",
    bg: "rgba(58,147,177,0.14)",
  },
  subtask: {
    value: "subtask",
    label: "Subtask",
    icon: ListTree,
    color: "#016a83",
    bg: "rgba(1,106,131,0.12)",
  },
  bug: {
    value: "bug",
    label: "Bug",
    icon: Bug,
    color: "#d1495b",
    bg: "rgba(209,73,91,0.12)",
  },
};

export const WORK_ITEM_TYPE_LIST = Object.values(WORK_ITEM_TYPES);

/** Types offered when *creating* a work item — Epic is intentionally excluded
 *  (epics are containers you select via "Select Epic", not board cards). */
export const CREATABLE_WORK_ITEM_TYPES = WORK_ITEM_TYPE_LIST.filter((t) => t.value !== "epic");

// ─── Board templates ────────────────────────────────────────────────────────
export type BoardKind = "kanban" | "scrum" | "bugtracker" | "custom";

export interface BoardTypeConfig {
  value: BoardKind;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const BOARD_TYPES: BoardTypeConfig[] = [
  { value: "kanban", label: "Kanban", description: "Continuous flow of work across simple status columns.", icon: Kanban },
  { value: "scrum", label: "Scrum", description: "Plan sprints from a backlog and ship in fixed cycles.", icon: RefreshCw },
  { value: "bugtracker", label: "Bug Tracker", description: "Triage, track and resolve bugs on a focused board.", icon: Bug },
  { value: "custom", label: "Custom Board", description: "Start from a clean Kanban and tailor statuses to your flow.", icon: SlidersHorizontal },
];

export function boardTypeLabel(kind: BoardKind) {
  return BOARD_TYPES.find((b) => b.value === kind)?.label ?? "Kanban";
}

export interface BoardColumn {
  id: string;
  label: string;
}

export const DEFAULT_COLUMNS: BoardColumn[] = [
  { id: "todo", label: "To Do" },
  { id: "inprogress", label: "In Progress" },
  { id: "inreview", label: "In Review" },
  { id: "done", label: "Done" },
];

export function columnLabel(id: string, columns: BoardColumn[] = DEFAULT_COLUMNS) {
  return columns.find((c) => c.id === id)?.label ?? id;
}

export interface WorkItemAttachment {
  id: string;
  name: string;
  meta?: string;
}

export interface SpaceWorkItem {
  id: string;
  title: string;
  type: WorkItemType;
  status: string;
  assignee?: string | null;
  dueDate?: string | null;
  description?: string | null;
  label?: string | null;
  epicId?: string | null;
  attachments?: WorkItemAttachment[];
}
