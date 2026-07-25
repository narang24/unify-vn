"use client";

import * as React from "react";
import Image from "next/image";
import {
  Code2, Paperclip, Trash2, X, Layers, Sparkles, User,
  ChevronRight, CheckCircle2, Clock, AlertCircle, Lightbulb, ExternalLink
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
const SMART_ASSIGNEES = [
  {
    name: "Vanshika Narang",
    initials: "VN",
    score: 96,
    reasons: ["Owner of similar past tasks", "Low current workload", "Expert in this area"],
    skills: ["React", "TypeScript", "UI/UX"],
    workload: 2,
    maxWorkload: 8,
  },
  {
    name: "Alex Chen",
    initials: "AC",
    score: 82,
    reasons: ["Resolved 3 similar issues", "Available bandwidth"],
    skills: ["Node.js", "APIs"],
    workload: 5,
    maxWorkload: 8,
  },
  {
    name: "Maya Patel",
    initials: "MP",
    score: 71,
    reasons: ["Relevant skill set", "Previously worked on related epic"],
    skills: ["Python", "Data"],
    workload: 6,
    maxWorkload: 8,
  },
];

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
            <DialogDescription className="mt-0.5 text-[11px]">{spaceName} · {typeConfig.label}</DialogDescription>
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
              width={18}
              height={18}
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
            <div className="flex-1 text-[12.5px] text-foreground">
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
          <div className="grid flex-1 grid-cols-[1fr_256px] divide-x divide-border-subtle overflow-hidden">
            {/* Left — main fields */}
            <div className="space-y-4 overflow-y-auto scroll-thin p-5">
              <div className="space-y-1.5">
                <Label htmlFor="ewi-title">Title</Label>
                <Input
                  id="ewi-title"
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ewi-desc">Description</Label>
                <textarea
                  id="ewi-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Add more detail…"
                  className="w-full resize-none rounded-lg border border-border-subtle bg-panel px-3 py-2 text-[13px] text-foreground placeholder:text-muted focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-1.5">
                <Label>Attachments</Label>
                <div className="space-y-1.5">
                  {attachments.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border-subtle px-2.5 py-1.5">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">{a.name}</span>
                      {a.meta && <span className="text-[11px] text-muted">{a.meta}</span>}
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
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-subtle px-3 py-2 text-[12.5px] text-muted hover:border-accent hover:text-foreground"
                  >
                    <Paperclip className="h-3.5 w-3.5" /> Add attachment
                  </button>
                  <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
                </div>
              </div>
            </div>

            {/* Right — metadata sidebar */}
            <div className="flex flex-col gap-4 overflow-y-auto scroll-thin p-4">
              {/* Type */}
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onChange={(v) => setType(v as WorkItemType)} options={typeOptions} />
              </div>

              {/* Epic */}
              <div className="space-y-1.5">
                <Label>Epic</Label>
                <Select value={epicId} onChange={setEpicId} options={epicOptions} />
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <Label htmlFor="ewi-assignee">Assignee</Label>
                <div className="flex gap-2">
                  <Input
                    id="ewi-assignee"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="Unassigned"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAssigneeRec((s) => !s)}
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                      showAssigneeRec
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border-subtle text-muted hover:border-accent/50 hover:text-accent"
                    )}
                    title="Smart Assignee Recommendation"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Due date */}
              <div className="space-y-1.5">
                <Label htmlFor="ewi-due">Due date</Label>
                <Input id="ewi-due" type="date" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} />
              </div>

              {/* Label */}
              <div className="space-y-1.5">
                <Label htmlFor="ewi-label">Label</Label>
                <Input
                  id="ewi-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. frontend"
                />
              </div>
            </div>
          </div>

          {/* Smart Assignee Recommendation panel */}
          {showAssigneeRec && (
            <SmartAssigneePanel
              onSelect={(name) => {
                setAssignee(name);
                setShowAssigneeRec(false);
              }}
            />
          )}

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

function SmartAssigneePanel({ onSelect }: { onSelect: (name: string) => void }) {
  return (
    <div className="border-t border-border-subtle bg-panel-strong/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
        </div>
        <span className="text-[13px] font-semibold text-foreground">Smart Assignee Recommendation</span>
        <span className="ml-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10.5px] font-medium text-accent">AI</span>
      </div>
      <p className="mb-3 text-[11.5px] text-muted">
        Based on skills, past contributions, current workload, and similar resolved items.
      </p>
      <div className="space-y-2">
        {SMART_ASSIGNEES.map((a, i) => (
          <AssigneeCard key={a.name} assignee={a} rank={i + 1} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function AssigneeCard({
  assignee,
  rank,
  onSelect,
}: {
  assignee: (typeof SMART_ASSIGNEES)[0];
  rank: number;
  onSelect: (name: string) => void;
}) {
  const workloadPct = (assignee.workload / assignee.maxWorkload) * 100;
  const workloadColor =
    workloadPct < 50 ? "bg-emerald-500" : workloadPct < 75 ? "bg-amber-500" : "bg-danger";

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-panel p-3 shadow-sm">
      <Avatar name={assignee.name} size={34} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-foreground">{assignee.name}</span>
          {rank === 1 && (
            <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-accent">
              Best match
            </span>
          )}
          <span className="ml-auto text-[12px] font-bold text-accent">{assignee.score}%</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {assignee.skills.map((s) => (
            <span key={s} className="rounded bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] text-muted">
              {s}
            </span>
          ))}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[10.5px] text-muted">Workload</span>
          <div className="h-1.5 flex-1 rounded-full bg-border-subtle overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", workloadColor)}
              style={{ width: `${workloadPct}%` }}
            />
          </div>
          <span className="text-[10px] text-muted">{assignee.workload}/{assignee.maxWorkload}</span>
        </div>
        <div className="mt-1.5 space-y-0.5">
          {assignee.reasons.map((r) => (
            <div key={r} className="flex items-center gap-1 text-[10.5px] text-muted">
              <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
              {r}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onSelect(assignee.name)}
        className="flex h-7 shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-accent-soft"
      >
        Assign <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}
