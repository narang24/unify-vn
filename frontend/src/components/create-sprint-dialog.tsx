"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { SprintStatus } from "@/lib/work-item-types";

export interface SprintPayload {
  name: string;
  goal?: string | null;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  spaceId: string;
}

export function CreateSprintDialog({
  open,
  onOpenChange,
  onSubmit,
  spaceName,
  spaceId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (payload: SprintPayload) => void | Promise<void>;
  spaceName: string;
  spaceId: string;
}) {
  const [name, setName] = React.useState("");
  const [goal, setGoal] = React.useState("");
  const [duration, setDuration] = React.useState("2");
  
  // Format YYYY-MM-DD
  const [startDate, setStartDate] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setGoal("");
      setDuration("2");
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setSubmitting(false);
    }
  }, [open]);

  // Compute end date if duration is not custom
  const computedEndDate = React.useMemo(() => {
    if (duration === "custom") return endDate;
    if (!startDate) return "";
    const date = new Date(startDate);
    date.setDate(date.getDate() + parseInt(duration) * 7);
    return date.toISOString().split("T")[0];
  }, [duration, startDate, endDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !startDate || !computedEndDate) return;
    setSubmitting(true);
    await onSubmit({
      name: name.trim(),
      goal: goal.trim() || null,
      startDate,
      endDate: computedEndDate,
      status: "planning",
      spaceId,
    });
    setSubmitting(false);
    onOpenChange(false);
  }

  const spaceOptions = [{ value: spaceId, label: spaceName }];
  const durationOptions = [
    { value: "1", label: "1 week" },
    { value: "2", label: "2 weeks" },
    { value: "3", label: "3 weeks" },
    { value: "4", label: "4 weeks" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Create Sprint" className="max-w-2xl p-0 gap-0 overflow-hidden" hideCloseButton>
        <div className="flex items-center justify-between border-b border-border-subtle bg-panel-strong px-5 py-3">
          <h2 className="text-[15px] font-bold text-foreground">Create sprint</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto p-5 scroll-thin">
            
            <div className="grid grid-cols-2 gap-4">
              {/* Space */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-muted">Space</Label>
                <Select value={spaceId} onChange={() => {}} options={spaceOptions} />
              </div>
              
              {/* Duration */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-muted">Duration</Label>
                <Select value={duration} onChange={setDuration} options={durationOptions} />
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5 border-t border-border-subtle pt-4">
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sprint name"
                className="h-9 border-none shadow-none px-1 text-lg font-bold focus-visible:ring-0 placeholder:text-[#0c8f8f]/40"
              />
            </div>

            {/* Goal */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-muted">Sprint goal</Label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What do you want to achieve in this sprint?"
                className="min-h-20 w-full resize-y rounded-md border border-border-subtle bg-transparent px-3 py-2 text-[13px] font-semibold text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 border-t border-border-subtle pt-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-muted">Start date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 font-semibold text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-muted">End date</Label>
                <Input
                  type="date"
                  value={computedEndDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 font-semibold text-[13px]"
                  disabled={duration !== "custom"}
                />
              </div>
            </div>

          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border-subtle bg-panel-strong px-5 py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !startDate || !computedEndDate || submitting}>
              {submitting ? "Creating..." : "Create sprint"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
