"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BOARD_TYPES, type BoardKind } from "@/lib/work-item-types";
import Image from "next/image";

const BOARD_IMAGES: Record<BoardKind, string> = {
  kanban: "/kanban-sign.png",
  scrum: "/scrum-sign.png",
  bugtracker: "/bug-sign.webp",
  custom: "/custom-sign.png",
};

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
      <DialogContent title="Create space" className="max-w-md font-semibold p-5">
        <DialogHeader className="mb-2 space-y-0">
          <DialogTitle className="font-bold text-[16.5px]">Create a space</DialogTitle>
          <DialogDescription className="font-semibold text-muted text-[11.5px]">Name your space and pick a board template to start from.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              id="sp-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Space Name"
              className="text-lg font-bold h-11 border-0 border-b-2 border-border-subtle/75 rounded-none px-0 focus-visible:ring-0 placeholder:text-teal-900/60 placeholder:font-bold bg-transparent"
            />
          </div>

          <div className="space-y-5">
            <Label className="text-[12.5px] font-bold text-foreground">Board type</Label>
            <div className="grid grid-cols-1 gap-2">
              {BOARD_TYPES.map((bt) => {
                const active = kind === bt.value;
                return (
                  <button
                    key={bt.value}
                    type="button"
                    onClick={() => setKind(bt.value)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all",
                      active ? "border-accent bg-accent/[0.04] shadow-sm" : "border-border-subtle hover:bg-foreground/[0.02]",
                    )}
                  >
                    <Image 
                      src={BOARD_IMAGES[bt.value] || "/custom-sign.png"} 
                      alt={bt.label} 
                      width={36} 
                      height={36} 
                      className="rounded-md object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className={cn("text-[13px] font-bold mb-0.5", active ? "text-accent" : "text-foreground")}>
                        {bt.label}
                      </span>
                      <p className="text-[11.5px] leading-snug text-muted font-semibold">{bt.description}</p>
                    </div>
                    <div className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      active ? "bg-accent border-accent text-white" : "border-muted/50 bg-transparent"
                    )}>
                      {active && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" className="font-bold rounded-lg px-4 h-8" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="font-bold rounded-lg px-5 h-8" disabled={!name.trim() || submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
