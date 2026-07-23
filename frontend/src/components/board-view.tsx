"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, MoreHorizontal, ArrowRight, Pencil, Paperclip } from "lucide-react";
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
  const [overCol, setOverCol] = React.useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);

  function handleDrop(colId: string) {
    if (dragItem) onMove(dragItem, colId);
    setDragItem(null);
    setOverCol(null);
  }

  return (
    <div className="flex h-full items-start gap-3 overflow-x-auto overflow-y-auto scroll-thin p-4">
      {columns.map((col) => {
        const colItems = items.filter((i) => i.status === col.id);
        const isOver = overCol === col.id && dragItem !== null;
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
              "flex w-72 shrink-0 flex-col self-start rounded-xl border bg-panel-strong/40 p-2 transition-colors",
              isOver ? "border-accent bg-accent/[0.06]" : "border-transparent",
            )}
          >
            <div className="mb-2 flex items-center justify-between px-1.5 pt-1">
              <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
                {col.label}
                <span className="rounded-full bg-foreground/[0.08] px-1.5 py-0.5 text-[10.5px] text-muted">
                  {colItems.length}
                </span>
              </div>
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
                    onDragStart={() => setDragItem(item.id)}
                    onDragEnd={() => {
                      setDragItem(null);
                      setOverCol(null);
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>

            <button
              onClick={() => onCreate(col.id)}
              className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] text-muted hover:bg-foreground/[0.06] hover:text-foreground"
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
      className={cn(
        "group cursor-grab rounded-lg border border-border-subtle bg-panel p-2.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        dragging && "ring-2 ring-accent",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium leading-snug text-foreground">{item.title}</p>
        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="rounded-md p-0.5 text-muted hover:bg-foreground/[0.06] hover:text-foreground"
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <button className="rounded-md p-0.5 text-muted hover:bg-foreground/[0.06]" aria-label="Move">
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
        <span className="mt-1.5 inline-block rounded bg-foreground/[0.06] px-1.5 py-0.5 text-[10.5px] text-muted">
          {item.label}
        </span>
      )}

      <div className="mt-2 flex items-center justify-between">
        <Badge style={{ color: typeConfig.color, background: typeConfig.bg }} className="gap-1">
          <Icon className="h-3 w-3" style={{ color: typeConfig.color }} />
          {typeConfig.label}
        </Badge>
        <div className="flex items-center gap-1.5">
          {item.attachments && item.attachments.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10.5px] text-muted">
              <Paperclip className="h-3 w-3" />
              {item.attachments.length}
            </span>
          )}
          {item.dueDate && <span className="text-[10.5px] text-muted">{formatDue(item.dueDate)}</span>}
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
