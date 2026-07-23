"use client";

import * as React from "react";
import { Code2, Paperclip, Trash2, X, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  CREATABLE_WORK_ITEM_TYPES,
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

function uid() {
  return `att_${Math.random().toString(36).slice(2, 9)}`;
}

export function WorkItemDialog({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  disabled,
  spaceName,
  epics = [],
  editing,
  defaultDueDate,
  linkedSnippet,
  presetAttachments,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (payload: WorkItemPayload) => void | Promise<void>;
  onDelete?: (id: string) => void;
  disabled?: boolean;
  spaceName: string;
  epics?: SpaceWorkItem[];
  editing?: SpaceWorkItem | null;
  defaultDueDate?: string | null;
  linkedSnippet?: { text: string; path: string } | null;
  presetAttachments?: WorkItemAttachment[];
}) {
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<WorkItemType>("task");
  const [description, setDescription] = React.useState("");
  const [assignee, setAssignee] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [epicId, setEpicId] = React.useState<string>("");
  const [attachments, setAttachments] = React.useState<WorkItemAttachment[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const isEdit = !!editing;

  // Initialise the form whenever the dialog is (re)opened
  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setType(editing.type === "epic" ? "task" : editing.type);
      setDescription(editing.description ?? "");
      setAssignee(editing.assignee ?? "");
      setDueDate(editing.dueDate ?? "");
      setLabel(editing.label ?? "");
      setEpicId(editing.epicId ?? "");
      setAttachments(editing.attachments ?? []);
    } else {
      setTitle(linkedSnippet ? `Follow-up in ${linkedSnippet.path.split("/").pop()}` : "");
      setType(linkedSnippet ? "bug" : "task");
      setDescription("");
      setAssignee("");
      setDueDate(defaultDueDate ?? "");
      setLabel("");
      setEpicId("");
      setAttachments(
        linkedSnippet
          ? [{ id: uid(), name: linkedSnippet.path.split("/").pop() ?? "snippet", meta: "code snippet" }, ...(presetAttachments ?? [])]
          : (presetAttachments ?? []),
      );
    }
  }, [open, editing, defaultDueDate, linkedSnippet, presetAttachments]);

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
      id: editing?.id,
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

  const typeOptions = CREATABLE_WORK_ITEM_TYPES.map((t) => ({
    value: t.value,
    label: t.label,
    icon: <t.icon className="h-3.5 w-3.5" style={{ color: t.color }} />,
  }));

  const epicOptions = [
    { value: "", label: "No epic" },
    ...epics.map((e) => ({ value: e.id, label: e.title, icon: <Layers className="h-3.5 w-3.5 text-[#7c5cff]" /> })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? "Edit work item" : "Create work item"} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit work item" : "Create work item"}</DialogTitle>
          <DialogDescription>
            {disabled ? "Select a space first." : linkedSnippet ? "Linked to a code snippet from the repository." : "Fill in the details below."}
          </DialogDescription>
        </DialogHeader>

        {linkedSnippet && (
          <div className="mb-3 rounded-lg border border-border-subtle bg-panel-strong/40 p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
              <Code2 className="h-3.5 w-3.5 text-accent" /> {linkedSnippet.path}
            </div>
            <pre className="max-h-24 overflow-auto scroll-thin whitespace-pre-wrap text-[11.5px] text-foreground">{linkedSnippet.text}</pre>
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-h-[65vh] space-y-3 overflow-y-auto scroll-thin pr-0.5">
          <div className="space-y-1.5">
            <Label>Space</Label>
            <div className="flex h-9 items-center rounded-lg border border-border-subtle bg-panel-strong/40 px-3 text-[13px] text-muted">
              {spaceName || "—"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Work item type</Label>
              <Select value={type} onChange={(v) => setType(v as WorkItemType)} options={typeOptions} />
            </div>
            <div className="space-y-1.5">
              <Label>Select epic</Label>
              <Select value={epicId} onChange={setEpicId} options={epicOptions} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wi-title">Title</Label>
            <Input id="wi-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wi-desc">Description</Label>
            <textarea
              id="wi-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add more detail…"
              className="w-full resize-none rounded-lg border border-border-subtle bg-panel px-3 py-2 text-[13px] text-foreground placeholder:text-muted focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wi-assignee">Assignee</Label>
              <Input id="wi-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="e.g. VN" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wi-due">Due date</Label>
              <Input id="wi-due" type="date" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wi-label">Label</Label>
            <Input id="wi-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. frontend, urgent" />
          </div>

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
                    aria-label="Remove attachment"
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

          <DialogFooter className="items-center">
            {isEdit && onDelete && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-danger hover:bg-danger/10"
                onClick={() => {
                  onDelete(editing!.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || submitting || disabled}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
