"use client";

import * as React from "react";
import Image from "next/image";
import {
  Code2, Paperclip, Trash2, X, Layers, Sparkles, User,
  ChevronRight, CheckCircle2, Clock, AlertCircle, Lightbulb, ExternalLink,
  ArrowLeft, CircleCheckBig,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CREATABLE_WORK_ITEM_TYPES,
  WORK_ITEM_TYPES,
  type SpaceWorkItem,
  type WorkItemAttachment,
  type WorkItemType,
} from "@/lib/work-item-types";

export interface WorkItemPayload {
  id?: string;
  title: string;
  type: WorkItemType;
  status?: string;
  description?: string | null;
  assignee?: string | null;
  dueDate?: string | null;
  label?: string | null;
  epicId?: string | null;
  attachments?: WorkItemAttachment[];
}

// ── Smart assignee recommendation mock data ───────────────────────────────────
export type SmartAssignee = {
  name: string;
  initials: string;
  score: number;
  reasons: string[];
  skills: string[];
  workload: number;
  maxWorkload: number;
};

const SMART_ASSIGNEES: SmartAssignee[] = [];

function uid() {
  return `att_${Math.random().toString(36).slice(2, 9)}`;
}

export function EditWorkItemDialog({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  onOpenIntelli,
  disabled,
  spaceName,
  epics = [],
  editing,
  initialAiChanges,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (payload: WorkItemPayload) => void | Promise<void>;
  onDelete?: (id: string) => void;
  onOpenIntelli?: (item: SpaceWorkItem) => void;
  disabled?: boolean;
  spaceName: string;
  epics?: SpaceWorkItem[];
  editing: SpaceWorkItem;
  initialAiChanges?: WorkItemPayload | null;
}) {
  const [title, setTitle] = React.useState(editing.title);
  const [type, setType] = React.useState<WorkItemType>(editing.type === "epic" ? "task" : editing.type);
  const [description, setDescription] = React.useState(editing.description ?? "");
  const [assignee, setAssignee] = React.useState(editing.assignee ?? "");
  const [dueDate, setDueDate] = React.useState(editing.dueDate ?? "");
  const [label, setLabel] = React.useState(editing.label ?? "");
  const [epicId, setEpicId] = React.useState(editing.epicId ?? "");
  const [attachments, setAttachments] = React.useState<WorkItemAttachment[]>(editing.attachments ?? []);
  const [submitting, setSubmitting] = React.useState(false);
  const [showAssigneeRec, setShowAssigneeRec] = React.useState(false);
  const [aiChanges, setAiChanges] = React.useState<WorkItemPayload | null>(initialAiChanges ?? null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Sync form when editing item changes
  React.useEffect(() => {
    if (!open) return;
    setTitle(editing.title);
    setType(editing.type === "epic" ? "task" : editing.type);
    setDescription(editing.description ?? "");
    setAssignee(editing.assignee ?? "");
    setDueDate(editing.dueDate ?? "");
    setLabel(editing.label ?? "");
    setEpicId(editing.epicId ?? "");
    setAttachments(editing.attachments ?? []);
    setAiChanges(initialAiChanges ?? null);
    setShowAssigneeRec(false);
  }, [open, editing, initialAiChanges]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).map((f) => ({
      id: uid(),
      name: f.name,
      meta: `${(f.size / 1024).toFixed(0)} KB`,
    }));
    setAttachments((a) => [...a, ...next]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    await onSubmit({
      id: editing.id,
      title: title.trim(),
      type,
      description: description.trim() || null,
      assignee: assignee.trim() || null,
      dueDate: dueDate || null,
      label: label.trim() || null,
      epicId: epicId || null,
      attachments,
    });
    setSubmitting(false);
    onOpenChange(false);
  }

  function applyAiChanges() {
    if (!aiChanges) return;
    if (aiChanges.title) setTitle(aiChanges.title);
    if (aiChanges.description !== undefined) setDescription(aiChanges.description ?? "");
    if (aiChanges.assignee !== undefined) setAssignee(aiChanges.assignee ?? "");
    if (aiChanges.dueDate !== undefined) setDueDate(aiChanges.dueDate ?? "");
    if (aiChanges.label !== undefined) setLabel(aiChanges.label ?? "");
    setAiChanges(null);
  }

  const typeOptions = CREATABLE_WORK_ITEM_TYPES.map((t) => ({
    value: t.value,
    label: t.label,
    icon: <t.icon className="h-3.5 w-3.5" style={{ color: t.color }} />,
  }));

  const epicOptions = [
    { value: "", label: "No epic" },
    ...epics.map((e) => ({ value: e.id, label: e.title, icon: <Layers className="h-3.5 w-3.5 text-[#7c5cff]" /> })),
  ];

  const typeConfig = WORK_ITEM_TYPES[editing.type] ?? WORK_ITEM_TYPES.task;
  const TypeIcon = typeConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Edit work item" className="max-w-2xl p-0 gap-0 overflow-hidden" hideCloseButton>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-3.5">
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
            style={{ background: typeConfig.bg }}
          >
            <TypeIcon className="h-3.5 w-3.5" style={{ color: typeConfig.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[14px] font-semibold">{editing.title}</DialogTitle>
            <DialogDescription className="mt-0.5 text-[11px] font-semibold">{spaceName} · {typeConfig.label}</DialogDescription>
          </div>
          {/* Ask Unify Intelli button */}
          <button
            type="button"
            onClick={() => onOpenIntelli?.(editing)}
            className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/[0.07] px-3 py-1.5 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/[0.14]"
          >
            <Image
              src="/unify-intelli-icon.png"
              alt="Unify Intelli"
              width={24}
              height={24}
              className="rounded-sm"
            />
            Ask Unify Intelli
            <ExternalLink className="h-3 w-3 opacity-60" />
          </button>
        </div>

        {/* AI change suggestion banner */}
        {aiChanges && (
          <div className="flex items-start gap-3 border-b border-amber-500/20 bg-amber-500/[0.07] px-5 py-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="flex-1 text-[12.5px] font-semibold text-foreground">
              <span className="font-semibold text-amber-500">Unify Intelli suggested changes.</span>{" "}
              Review below and click &ldquo;Apply Changes&rdquo; to update the fields.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={applyAiChanges}
                className="rounded-md bg-amber-500/20 px-2.5 py-1 text-[11.5px] font-semibold text-amber-500 hover:bg-amber-500/30"
              >
                Apply Changes
              </button>
              <button
                onClick={() => setAiChanges(null)}
                className="rounded-md px-2 py-1 text-[11.5px] text-muted hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex h-full max-h-[72vh] flex-col overflow-y-auto scroll-thin">
          <div className="grid flex-1 grid-cols-1 divide-y divide-border-subtle overflow-hidden md:grid-cols-[1fr_256px] md:divide-x md:divide-y-0">
            {/* Left — main fields or Smart Assignee view */}
            <div className="overflow-y-auto scroll-thin">
              {showAssigneeRec ? (
                <SmartAssigneePanel
                  onBack={() => setShowAssigneeRec(false)}
                  onSelect={(name) => {
                    setAssignee(name);
                    setShowAssigneeRec(false);
                  }}
                />
              ) : (
              <div className="overflow-y-auto scroll-thin p-5">
              {/* Title — bold and editable */}
              <div className="mb-4">
                <input
                  id="ewi-title"
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full bg-transparent text-[18px] font-bold text-foreground placeholder:text-muted/50 focus:outline-none"
                />
              </div>

              <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ewi-desc" className="font-semibold">Description</Label>
                <textarea
                  id="ewi-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Add more detail…"
                  className="w-full resize-none rounded-lg border border-border-subtle bg-panel px-3 py-2 text-[13px] font-semibold text-foreground placeholder:text-muted focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-1.5">
                <Label className="font-semibold">Attachments</Label>
                <div className="space-y-1.5">
                  {attachments.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border-subtle px-2.5 py-1.5">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-foreground">{a.name}</span>
                      {a.meta && <span className="text-[11px] font-semibold text-muted">{a.meta}</span>}
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                        className="rounded-md p-0.5 text-muted hover:text-danger"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-subtle px-3 py-2 text-[12.5px] font-semibold text-muted hover:border-accent hover:text-foreground"
                  >
                    <Paperclip className="h-3.5 w-3.5" /> Add attachment
                  </button>
                  <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

            <div className="flex flex-col gap-4 overflow-y-auto scroll-thin p-4">
              {/* Type */}
              <div className="space-y-1.5">
                <Label className="font-semibold">Type</Label>
                <Select value={type} onChange={(v) => setType(v as WorkItemType)} options={typeOptions} className="[&_button]:font-semibold" />
              </div>

              {/* Epic */}
              <div className="space-y-1.5">
                <Label className="font-semibold">Epic</Label>
                <Select value={epicId} onChange={setEpicId} options={epicOptions} className="[&_button]:font-semibold" />
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <Label htmlFor="ewi-assignee" className="font-semibold">Assignee</Label>
                <div className="flex gap-2">
                  <Input
                    id="ewi-assignee"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="Unassigned"
                    className="flex-1 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAssigneeRec((s) => !s)}
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                      showAssigneeRec
                        ? "border-accent bg-accent/10"
                        : "border-border-subtle hover:border-accent/50"
                    )}
                    title="Smart Assignee Recommendation"
                  >
                    <Image src="/unify-intelli-icon.png" width={28} height={28} alt="Unify Intelli" />
                  </button>
                </div>
              </div>

              {/* Due date */}
              <div className="space-y-1.5">
                <Label htmlFor="ewi-due" className="font-semibold">Due date</Label>
                <Input id="ewi-due" type="date" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} className="font-semibold" />
              </div>

              {/* Label */}
              <div className="space-y-1.5">
                <Label htmlFor="ewi-label" className="font-semibold">Label</Label>
                <Input
                  id="ewi-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. frontend"
                  className="font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center border-t border-border-subtle px-5 py-3">
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-danger hover:bg-danger/10"
                onClick={() => {
                  onDelete(editing.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || submitting || disabled}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Smart Assignee Recommendation panel ───────────────────────────────────────

function SmartAssigneePanel({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="flex h-full flex-col p-5">
      {/* Header row */}
      <div className="mb-4 flex items-start justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold text-muted hover:bg-foreground/[0.06] hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="flex flex-col items-end text-right">
          <span className="text-[13px] font-bold text-foreground">Unify Intelli Recommends</span>
          <p className="mt-0.5 max-w-[200px] text-[10px] font-semibold text-muted">
            Based on skills, past contributions, current workload, and similar resolved items.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {SMART_ASSIGNEES.map((a) => (
          <AssigneeCard key={a.name} assignee={a} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function AssigneeCard({
  assignee,
  onSelect,
}: {
  assignee: SmartAssignee;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-panel p-3 shadow-sm">
      {/* Top row: avatar + name + workload badge + assign button */}
      <div className="flex items-center gap-2.5">
        <Avatar name={assignee.name} size={32} />
        <span className="flex-1 truncate text-[13px] font-semibold text-foreground">{assignee.name}</span>
        {/* Workload badge */}
        <span className="shrink-0 text-[11px] font-bold text-black">
          {assignee.workload}/{assignee.maxWorkload} <span className="text-gray-500">Work Overload</span>
        </span>
        <button
          type="button"
          onClick={() => onSelect(assignee.name)}
          className="shrink-0 rounded-lg bg-accent px-3 py-1 text-[11.5px] font-semibold text-white hover:bg-accent-soft"
        >
          Assign
        </button>
      </div>

      {/* Thick divider */}
      <div className="my-3 h-[2px] rounded-full bg-foreground/10" />

      {/* Skills & Reasons side by side */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Skills */}
        <div>
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted">Skills</p>
          <div className="flex flex-wrap gap-1">
            {assignee.skills.map((s) => (
              <span key={s} className="rounded bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Reasons */}
        <div>
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted">Reasons</p>
          <div className="space-y-0.5">
            {assignee.reasons.map((r) => (
              <div key={r} className="flex items-start gap-1 text-[10.5px] font-semibold text-foreground">
                <CircleCheckBig className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                {r}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
