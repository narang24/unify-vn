"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function SprintCompleteDialog({
  open,
  onOpenChange,
  openItemsCount,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  openItemsCount: number;
  onComplete: (moveTo: "next_sprint" | "backlog") => void | Promise<void>;
}) {
  const [moveTo, setMoveTo] = React.useState("backlog");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMoveTo("backlog");
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onComplete(moveTo as "next_sprint" | "backlog");
    setSubmitting(false);
    onOpenChange(false);
  }

  const moveOptions = [
    { value: "next_sprint", label: "Next sprint" },
    { value: "backlog", label: "Backlog" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Complete Sprint" className="max-w-md p-0 gap-0 overflow-hidden" hideCloseButton>
        <div className="flex items-center justify-between border-b border-border-subtle bg-panel-strong px-5 py-3">
          <h2 className="text-[15px] font-bold text-foreground">Complete sprint</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex flex-col gap-4 p-5">
            <p className="text-[13px] font-medium text-foreground">
              This sprint has <strong className="text-danger">{openItemsCount}</strong> open work {openItemsCount === 1 ? "item" : "items"}. Where would you like to move them?
            </p>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-muted">Move open items to</Label>
              <Select value={moveTo} onChange={setMoveTo} options={moveOptions} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border-subtle bg-panel-strong px-5 py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Completing..." : "Complete sprint"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
