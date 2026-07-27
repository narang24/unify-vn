"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, MoreHorizontal, ArrowRight, Pencil, Paperclip, MoveRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddStatusDialog } from "@/components/add-status-dialog";
import { DEFAULT_COLUMNS, WORK_ITEM_TYPES, type BoardColumn, type SpaceWorkItem } from "@/lib/work-item-types";
import { cn } from "@/lib/utils";

export type BoardWorkItem = SpaceWorkItem;

function getStatusStyles(statusLabel: string) {
  const upper = statusLabel.toUpperCase();
  const base = "rounded-md px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide shadow-sm";
  
  if (upper === "IN PROGRESS") return cn(base, "bg-blue-300 text-black");
  if (upper === "TO DO") return cn(base, "bg-slate-200 text-black");
  if (upper === "DONE") return cn(base, "bg-[#537B2F] text-white");
  if (upper === "IN REVIEW") return cn(base, "bg-[#B7410E] text-white");
  return cn(base, "bg-[#E6C998] text-black");
}

export function BoardView({
  items,
  columns = DEFAULT_COLUMNS,
  onMove,
  onCreate,
  onEdit,
  onAddColumn,
}: {
  items: BoardWorkItem[];
  columns?: BoardColumn[];
  onMove: (itemId: string, toStatus: string) => void;
  onCreate: (status: string) => void;
  onEdit?: (item: BoardWorkItem) => void;
  onAddColumn?: (label: string) => void;
}) {
  const [dragItem, setDragItem] = React.useState<string | null>(null);
  const [dragSourceCol, setDragSourceCol] = React.useState<string | null>(null);
  const [overCol, setOverCol] = React.useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);

  const isDragging = dragItem !== null;

  // Find the source column label
  const sourceLabel = React.useMemo(() => {
    if (!dragSourceCol) return "";
    return columns.find((c) => c.id === dragSourceCol)?.label ?? dragSourceCol;
  }, [dragSourceCol, columns]);

  function handleDragStart(itemId: string, fromCol: string) {
    setDragItem(itemId);
    setDragSourceCol(fromCol);
  }

  function handleDrop(colId: string) {
    if (dragItem) onMove(dragItem, colId);
    setDragItem(null);
    setDragSourceCol(null);
    setOverCol(null);
  }

  function handleDragEnd() {
    setDragItem(null);
    setDragSourceCol(null);
    setOverCol(null);
  }

  return (
    <div className="flex h-full items-start gap-3 overflow-x-auto overflow-y-auto scroll-thin p-4 font-semibold">
      {columns.map((col) => {
        const colItems = items.filter((i) => i.status === col.id);
        const isOver = overCol === col.id && isDragging && dragSourceCol !== col.id;
        const isSource = isDragging && dragSourceCol === col.id;
        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(col.id);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol((c) => (c === col.id ? null : c));
            }}
            onDrop={() => handleDrop(col.id)}
            className={cn(
              "flex w-[85vw] max-w-[280px] sm:w-72 sm:max-w-none shrink-0 flex-col self-start rounded-xl border-[3px] p-3 transition-all duration-200",
              isOver
                ? "border-teal-800 bg-teal-800/10 shadow-[inset_0_1px_12px_rgba(0,128,128,0.12)]"
                : isSource
                  ? "border-dashed border-teal-600/40 bg-[#e6f4f3]/40 dark:bg-foreground/[0.05]"
                  : "border-transparent bg-[#e6f4f3]/30 dark:bg-foreground/[0.03]",
            )}
          >
            {/* Column header — shows transition badge when dragging */}
            <div className="mb-2 flex items-center justify-between px-1.5 pt-1">
              {isSource ? (
                /* Source column: "Transition to..." */
                <div className="flex h-7 w-full items-center justify-center rounded-lg bg-teal-700 text-[11.5px] font-semibold text-white">
                  Transition to…
                </div>
              ) : isOver ? (
                /* Target column: "SOURCE → TARGET" */
                <div className="flex h-7 w-full items-center justify-center gap-2 text-muted">
                  <span className={getStatusStyles(sourceLabel)}>{sourceLabel}</span>
                  <MoveRight className="h-4 w-4 text-teal-600" />
                  <span className={getStatusStyles(col.label)}>{col.label}</span>
                </div>
              ) : (
                /* Default header */
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
                  {col.label}
                  <span className="rounded-md bg-foreground/8 px-1.5 py-0.5 text-[10.5px] font-semibold text-muted">
                    {colItems.length}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 px-0.5">
              <AnimatePresence initial={false}>
                {colItems.map((item) => (
                  <WorkItemCard
                    key={item.id}
                    item={item}
                    columns={columns}
                    onMove={onMove}
                    onEdit={onEdit}
                    dragging={dragItem === item.id}
                    onDragStart={() => handleDragStart(item.id, col.id)}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </AnimatePresence>
            </div>

            <button
              onClick={() => onCreate(col.id)}
              className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-semibold text-muted hover:bg-foreground/6 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Create
            </button>
          </div>
        );
      })}

      {/* Add custom status */}
      {onAddColumn && (
        <button
          onClick={() => setStatusDialogOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-xl border border-dashed border-border-subtle text-muted transition-colors hover:border-accent hover:text-accent"
          aria-label="Add status"
          title="Add status"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}

      <AddStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onCreate={(label) => onAddColumn?.(label)}
      />
    </div>
  );
}

function WorkItemCard({
  item,
  columns,
  onMove,
  onEdit,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  item: BoardWorkItem;
  columns: BoardColumn[];
  onMove: (itemId: string, toStatus: string) => void;
  onEdit?: (item: BoardWorkItem) => void;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const typeConfig = WORK_ITEM_TYPES[item.type] ?? WORK_ITEM_TYPES.task;
  const Icon = typeConfig.icon;

  return (
    <motion.div
      layout
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: dragging ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => {
        // Don't open edit if clicking the dropdown trigger or move buttons
        const target = e.target as HTMLElement;
        if (!target.closest("[data-no-card-click]") && onEdit) {
          onEdit(item);
        }
      }}
      className={cn(
        "group cursor-pointer rounded-lg border border-border-subtle bg-panel p-3 shadow-sm transition-shadow hover:border-accent/30 hover:shadow-md active:cursor-grabbing",
        dragging && "ring-2 ring-accent",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold leading-snug text-foreground">{item.title}</p>
        <div data-no-card-click className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <button className="rounded-md p-0.5 text-muted hover:bg-foreground/6" aria-label="Move">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </DropdownMenuItem>
              )}
              {columns.filter((c) => c.id !== item.status).map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => onMove(item.id, c.id)}>
                  <ArrowRight className="h-3.5 w-3.5" /> Move to {c.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {item.label && (
        <span className="mt-1.5 inline-block rounded-md bg-foreground/6 px-1.5 py-0.5 text-[10.5px] font-semibold text-muted">
          {item.label}
        </span>
      )}

      <div className="mt-2 flex items-center justify-between">
        <Badge style={{ color: typeConfig.color, background: typeConfig.bg }} className="gap-1 rounded-md px-2 py-0.5 font-semibold">
          <Icon className="h-3 w-3" style={{ color: typeConfig.color }} />
          {typeConfig.label}
        </Badge>
        <div className="flex items-center gap-1.5">
          {item.attachments && item.attachments.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10.5px] font-semibold text-muted">
              <Paperclip className="h-3 w-3" />
              {item.attachments.length}
            </span>
          )}
          {item.dueDate && <span className="text-[10.5px] font-semibold text-muted">{formatDue(item.dueDate)}</span>}
          {item.assignee && <Avatar name={item.assignee} size={20} />}
        </div>
      </div>
    </motion.div>
  );
}

function formatDue(d: string) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en", { day: "numeric", month: "short" });
}
