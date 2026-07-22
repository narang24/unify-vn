"use client";

import * as React from "react";
import { Kanban, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { BoardKind } from "@/lib/work-item-types";

export function CreateSpaceDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (name: string, kind: BoardKind) => Promise<void> | void;
}) {
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<BoardKind>("kanban");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await onCreate(name.trim(), kind);
    setSubmitting(false);
    setName("");
    setKind("kanban");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Create space">
        <DialogHeader>
          <DialogTitle>Create a space</DialogTitle>
          <DialogDescription>Choose a board type — you can create work items right after.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sp-name">Space name</Label>
            <Input
              id="sp-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mobile App"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Board type</Label>
            <div className="grid grid-cols-2 gap-2">
              <KindOption
                icon={Kanban}
                label="Kanban"
                description="Continuous flow"
                active={kind === "kanban"}
                onClick={() => setKind("kanban")}
              />
              <KindOption
                icon={RefreshCw}
                label="Scrum"
                description="Sprints & backlog"
                active={kind === "scrum"}
                onClick={() => setKind("scrum")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || submitting}>
              {submitting ? "Creating…" : "Create space"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function KindOption({
  icon: Icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors",
        active ? "border-accent bg-accent/10" : "border-border-subtle hover:bg-black/5",
      )}
    >
      <Icon className={cn("h-4 w-4", active ? "text-accent" : "text-muted")} />
      <span className={cn("text-[13px] font-medium", active && "text-accent")}>{label}</span>
      <span className="text-[11px] text-muted">{description}</span>
    </button>
  );
}
