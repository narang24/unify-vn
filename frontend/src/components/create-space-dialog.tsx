"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BOARD_TYPES, type BoardKind } from "@/lib/work-item-types";

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

  React.useEffect(() => {
    if (open) {
      setName("");
      setKind("kanban");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await onCreate(name.trim(), kind);
    setSubmitting(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Create space" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a space</DialogTitle>
          <DialogDescription>Name your space and pick a board template to start from.</DialogDescription>
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
              {BOARD_TYPES.map((bt) => {
                const Icon = bt.icon;
                const active = kind === bt.value;
                return (
                  <button
                    key={bt.value}
                    type="button"
                    onClick={() => setKind(bt.value)}
                    className={cn(
                      "group relative flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors",
                      active ? "border-accent bg-accent/[0.07]" : "border-border-subtle hover:bg-foreground/[0.04]",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md",
                          active ? "bg-accent text-accent-foreground" : "bg-foreground/[0.06] text-muted",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className={cn("text-[13px] font-semibold", active ? "text-accent" : "text-foreground")}>
                        {bt.label}
                      </span>
                      {active && <Check className="ml-auto h-3.5 w-3.5 text-accent" />}
                    </div>
                    <p className="text-[11.5px] leading-snug text-muted">{bt.description}</p>
                  </button>
                );
              })}
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
