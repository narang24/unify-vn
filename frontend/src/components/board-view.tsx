"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus, MoreHorizontal, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEFAULT_COLUMNS, WORK_ITEM_TYPES, type WorkItemType } from "@/lib/work-item-types";
import { cn } from "@/lib/utils";

export interface BoardWorkItem {
  id: string;
  title: string;
  type: WorkItemType;
  status: string;
  assignee?: string | null;
  dueDate?: string | null;
}

export function BoardView({
  items,
  onMove,
  onCreate,
}: {
  items: BoardWorkItem[];
  onMove: (itemId: string, toStatus: string) => void;
  onCreate: (status: string) => void;
}) {
  return (
    <div className="flex h-full gap-3 overflow-x-auto scroll-thin p-4">
      {DEFAULT_COLUMNS.map((col) => {
        const colItems = items.filter((i) => i.status === col.id);
        return (
          <div key={col.id} className="flex w-72 shrink-0 flex-col rounded-2xl bg-panel-strong/40 p-2">
            <div className="mb-2 flex items-center justify-between px-1.5 pt-1">
              <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
                {col.label}
                <span className="rounded-full bg-black/6 px-1.5 py-0.5 text-[10.5px] text-muted">
                  {colItems.length}
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto scroll-thin px-0.5 pb-1">
              <AnimatePresence initial={false}>
                {colItems.map((item) => (
                  <WorkItemCard key={item.id} item={item} onMove={onMove} />
                ))}
              </AnimatePresence>
            </div>

            <button
              onClick={() => onCreate(col.id)}
              className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-muted hover:bg-black/5 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Create
            </button>
          </div>
        );
      })}
    </div>
  );
}

function WorkItemCard({
  item,
  onMove,
}: {
  item: BoardWorkItem;
  onMove: (itemId: string, toStatus: string) => void;
}) {
  const typeConfig = WORK_ITEM_TYPES[item.type] ?? WORK_ITEM_TYPES.task;
  const Icon = typeConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      whileHover={{ y: -1 }}
      className="group rounded-xl border border-border-subtle bg-panel p-2.5 shadow-[0_1px_0_rgba(255,255,255,0.4)] hover:shadow-[0_8px_20px_rgba(4,25,28,0.08)]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium leading-snug text-foreground">{item.title}</p>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <button
              className="shrink-0 rounded-md p-0.5 text-muted opacity-0 hover:bg-black/5 group-hover:opacity-100"
              aria-label="Move"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {DEFAULT_COLUMNS.filter((c) => c.id !== item.status).map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => onMove(item.id, c.id)}>
                <ArrowRight className="h-3.5 w-3.5" /> Move to {c.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <Badge style={{ color: typeConfig.color, background: typeConfig.bg }} className={cn("gap-1")}>
          <Icon className="h-3 w-3" style={{ color: typeConfig.color }} />
          {typeConfig.label}
        </Badge>
        <div className="flex items-center gap-1.5">
          {item.dueDate && <span className="text-[10.5px] text-muted">{item.dueDate}</span>}
          {item.assignee && <Avatar name={item.assignee} size={20} />}
        </div>
      </div>
    </motion.div>
  );
}
