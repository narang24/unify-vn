import { Bug, Layers, BookMarked, CheckSquare, ListTree } from "lucide-react";
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

export type BoardKind = "kanban" | "scrum";

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

export function columnLabel(id: string) {
  return DEFAULT_COLUMNS.find((c) => c.id === id)?.label ?? id;
}

export interface SpaceWorkItem {
  id: string;
  title: string;
  type: WorkItemType;
  status: string;
  assignee?: string | null;
  dueDate?: string | null;
}
