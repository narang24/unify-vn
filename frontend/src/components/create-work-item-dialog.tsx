"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { WORK_ITEM_TYPE_LIST, type WorkItemType } from "@/lib/work-item-types";

export function CreateWorkItemDialog({
  open,
  onOpenChange,
  onCreate,
  disabled,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (title: string, type: WorkItemType) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<WorkItemType>("task");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    await onCreate(title.trim(), type);
    setSubmitting(false);
    setTitle("");
    setType("task");
    onOpenChange(false);
  }

  const options = WORK_ITEM_TYPE_LIST.map((t) => ({
    value: t.value,
    label: t.label,
    icon: <t.icon className="h-3.5 w-3.5" style={{ color: t.color }} />,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Create work item">
        <DialogHeader>
          <DialogTitle>Create work item</DialogTitle>
          <DialogDescription>
            {disabled ? "Select a space first." : "Epics, stories, tasks, subtasks and bugs all live on the board."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onChange={(v) => setType(v as WorkItemType)} options={options} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wi-title">Title</Label>
            <Input
              id="wi-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || submitting || disabled}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
