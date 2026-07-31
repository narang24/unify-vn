"use client";

import * as React from "react";
import { Code2, Paperclip, Trash2, X, Layers, Heading, Bold, Italic, Underline, Link, Image as ImageIcon, Quote, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import {
  WORK_ITEM_TYPE_LIST,
  type SpaceWorkItem,
  type WorkItemAttachment,
  type WorkItemType,
} from "@/lib/work-item-types";
import { useToast } from "@/lib/use-toast";

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

// ─── Editor CSS ─────────────────────────────────────────────────────────────
const EDITOR_STYLE = `
  .wi-editor:empty:before { content: attr(data-placeholder); color: #626f86; pointer-events: none; display: block; }
  .wi-editor b, .wi-editor strong { font-weight: 900 !important; }
  .wi-editor a { color: #0c8f8f; text-decoration: underline; cursor: pointer; }
  .wi-editor h3 { font-size: 14px; font-weight: 800; margin: 4px 0 2px; }
  .wi-editor blockquote { border-left: 3px solid rgba(12,143,143,0.35); padding-left: 8px; color: #626f86; margin: 4px 0; font-style: italic; }
  .wi-editor code { background: rgba(12,143,143,0.09); border-radius: 5px; padding: 1px 6px; font-family: ui-monospace, monospace; font-size: 12px; color: #0c8f8f; }
  .wi-editor img { max-width: 100%; border-radius: 6px; margin: 4px 0; }
`;

export function WorkItemDialog({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  disabled,
  spaceName,
  spaces = [],
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
  spaces?: { id: string; name: string }[];
  epics?: SpaceWorkItem[];
  editing?: SpaceWorkItem | null;
  defaultDueDate?: string | null;
  linkedSnippet?: { text: string; path: string } | null;
  presetAttachments?: WorkItemAttachment[];
}) {
  const { toast } = useToast();
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<WorkItemType>("task");
  const [description, setDescription] = React.useState("");
  const [assignee, setAssignee] = React.useState("you");
  const [dueDate, setDueDate] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [epicId, setEpicId] = React.useState<string>("");
  const [attachments, setAttachments] = React.useState<WorkItemAttachment[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  // Toolbar popover state
  const [linkPopover, setLinkPopover] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [imagePopover, setImagePopover] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState("");
  const [activeFormats, setActiveFormats] = React.useState<Record<string, boolean>>({});
  const savedRange = React.useRef<Range | null>(null);

  const spaceOptions = spaces.length > 0
    ? spaces.map(s => ({ value: s.id, label: s.name }))
    : [{ value: "default", label: spaceName || "Default Space" }];

  const [selectedSpace, setSelectedSpace] = React.useState(spaceOptions[0].value);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const imgFileRef = React.useRef<HTMLInputElement>(null);
  const descRef = React.useRef<HTMLDivElement>(null);
  const linkInputRef = React.useRef<HTMLInputElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const isEdit = !!editing;

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setType(editing.type === "epic" ? "task" : editing.type);
      setDescription(editing.description ?? "");
      if (descRef.current) descRef.current.innerHTML = editing.description ?? "";
      setAssignee(editing.assignee || "you");
      setDueDate(editing.dueDate ?? "");
      setLabel(editing.label ?? "");
      setEpicId(editing.epicId ?? "");
      setAttachments(editing.attachments ?? []);
    } else {
      setTitle(linkedSnippet ? `Follow-up in ${linkedSnippet.path.split("/").pop()}` : "");
      setType(linkedSnippet ? "bug" : "task");
      setDescription("");
      if (descRef.current) descRef.current.innerHTML = "";
      setAssignee("you");
      setDueDate(defaultDueDate ?? "");
      setLabel("");
      setEpicId("");
      setAttachments(
        linkedSnippet
          ? [{ id: uid(), name: linkedSnippet.path.split("/").pop() ?? "snippet", meta: "code snippet" }, ...(presetAttachments ?? [])]
          : (presetAttachments ?? []),
      );
    }
    setLinkPopover(false);
    setImagePopover(false);
  }, [open, editing, defaultDueDate, linkedSnippet, presetAttachments]);

  // Focus link input when popover opens
  React.useEffect(() => {
    if (linkPopover) setTimeout(() => linkInputRef.current?.focus(), 30);
  }, [linkPopover]);
  React.useEffect(() => {
    if (imagePopover) setTimeout(() => imageInputRef.current?.focus(), 30);
  }, [imagePopover]);

  /** Save the editor selection before we lose focus to a toolbar button */
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }

  /** Restore saved selection */
  function restoreSelection() {
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }

  function isNodeInTags(node: Node | null | undefined, tags: string[]) {
    while (node && node !== descRef.current) {
      if (tags.includes(node.nodeName)) return true;
      
      if (node.nodeName === "SPAN") {
        const el = node as HTMLElement;
        if (tags.includes("B") && (el.style.fontWeight === "bold" || el.style.fontWeight >= "700" || el.style.fontWeight === "bolder")) return true;
        if (tags.includes("I") && el.style.fontStyle === "italic") return true;
        if (tags.includes("U") && el.style.textDecoration.includes("underline")) return true;
      }
      
      node = node.parentNode;
    }
    return false;
  }

  function checkFormats() {
    if (!descRef.current) return;
    const sel = window.getSelection();
    setActiveFormats({
      bold: isNodeInTags(sel?.anchorNode, ["B", "STRONG"]),
      italic: isNodeInTags(sel?.anchorNode, ["I", "EM"]),
      underline: isNodeInTags(sel?.anchorNode, ["U"]),
      h3: isNodeInTags(sel?.anchorNode, ["H3"]),
      blockquote: isNodeInTags(sel?.anchorNode, ["BLOCKQUOTE"]),
      code: isNodeInTags(sel?.anchorNode, ["CODE"]),
    });
  }

  /** Run execCommand while keeping selection */
  function exec(cmd: string, value?: string) {
    if (!descRef.current) return;
    
    // Only apply formatting if text is actually selected
    const isFormattingCmd = ["bold", "italic", "underline", "formatBlock"].includes(cmd);
    if (isFormattingCmd) {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.toString().trim() === "") return;
    }
    
    descRef.current.focus();
    document.execCommand(cmd, false, value);
    setDescription(descRef.current.innerHTML);
    checkFormats();
  }

  /** Inline code — wraps selection in styled <code> or removes it */
  function applyInlineCode(e: React.MouseEvent) {
    e.preventDefault();
    saveSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !descRef.current) return;
    const range = savedRange.current ?? sel.getRangeAt(0);

    let node = range.commonAncestorContainer as Node | null;
    while (node && node !== descRef.current) {
      if (node.nodeName === 'CODE') {
        const parent = node.parentNode;
        if (parent) {
          while (node.firstChild) {
            parent.insertBefore(node.firstChild, node);
          }
          parent.removeChild(node);
          sel.removeAllRanges();
          setDescription(descRef.current.innerHTML);
          checkFormats();
          return;
        }
      }
      node = node.parentNode;
    }

    // Do nothing if no text is selected for formatting
    if (sel.isCollapsed || sel.toString().trim() === "") return;

    const text = range.toString();
    if (!text) return;
    const codeEl = document.createElement("code");
    codeEl.textContent = text;
    range.deleteContents();
    range.insertNode(codeEl);
    sel.removeAllRanges();
    setDescription(descRef.current.innerHTML);
    checkFormats();
  }

  /** Apply link from popover */
  function applyLink() {
    if (!linkUrl.trim() || !descRef.current) return;
    restoreSelection();
    document.execCommand("createLink", false, linkUrl.trim());
    setDescription(descRef.current.innerHTML);
    setLinkUrl("");
    setLinkPopover(false);
  }

  /** Insert image from URL */
  function applyImageUrl() {
    if (!imageUrl.trim() || !descRef.current) return;
    restoreSelection();
    document.execCommand("insertImage", false, imageUrl.trim());
    setDescription(descRef.current.innerHTML);
    setImageUrl("");
    setImagePopover(false);
  }

  /** Insert image from local file */
  function applyImageFile(files: FileList | null) {
    if (!files || !descRef.current) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      restoreSelection();
      document.execCommand("insertImage", false, ev.target?.result as string);
      if (descRef.current) setDescription(descRef.current.innerHTML);
    };
    reader.readAsDataURL(file);
  }

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
      assignee: assignee === "unassigned" ? null : assignee,
      dueDate: dueDate || null,
      label: label.trim() || null,
      epicId: epicId === "create_new" ? null : epicId || null,
      attachments,
    });
    setSubmitting(false);
    onOpenChange(false);
    
    if (!isEdit) {
      const typeLabel = WORK_ITEM_TYPE_LIST.find((t) => t.value === type)?.label || "Work Item";
      toast({ title: `${typeLabel} Created` });
    }
  }

  const typeOptions = WORK_ITEM_TYPE_LIST.map((t) => ({
    value: t.value,
    label: t.label,
    icon: <t.icon className="h-3.5 w-3.5" style={{ color: t.color }} />,
  }));

  const epicOptions = [
    { value: "", label: "No epic" },
    ...epics.map((e) => ({ value: e.id, label: e.title, icon: <Layers className="h-3.5 w-3.5 text-[#7c5cff]" /> })),
  ];

  const assigneeOptions = [
    { value: "you", label: "You (VN)", icon: <Avatar name="VN" size={18} /> },
    { value: "unassigned", label: "Unassigned", icon: <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-muted/20 text-muted"><User className="h-3 w-3" /></div> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <style>{EDITOR_STYLE}</style>
      <DialogContent title={isEdit ? "Edit work item" : "Create work item"} className="max-w-[550px] p-0 overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader className="px-5 pt-3 pb-0 mb-1 shrink-0">
          <DialogTitle className="font-bold">{isEdit ? "Edit work item" : "Create work item"}</DialogTitle>
          <DialogDescription className="font-semibold mt-0.5">
            {disabled ? "Select a space first." : linkedSnippet ? "Linked to a code snippet from the repository." : "Fill in the details below."}
          </DialogDescription>
        </DialogHeader>

        {linkedSnippet && (
          <div className="mx-5 mb-2 rounded-lg border border-border-subtle bg-panel-strong/40 p-2 shrink-0">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted">
              <Code2 className="h-3.5 w-3.5 text-accent" /> {linkedSnippet.path}
            </div>
            <pre className="max-h-20 overflow-auto scroll-thin whitespace-pre-wrap text-[11px] font-semibold text-foreground">{linkedSnippet.text}</pre>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scroll-thin px-5 pb-3 pt-1 font-semibold flex flex-col gap-3">

          {/* Top Attributes */}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <div className="space-y-1 col-span-2">
              <Label className="font-semibold text-muted text-[12px]">Space</Label>
              <Select value={selectedSpace} onChange={setSelectedSpace} options={spaceOptions} />
            </div>
            
            <div className="space-y-1">
              <Label className="font-semibold text-muted text-[12px]">Work Item Type</Label>
              <Select value={type} onChange={(v) => setType(v as WorkItemType)} options={typeOptions} />
            </div>
            
            {type !== "epic" ? (
              <div className="space-y-1">
                <Label className="font-semibold text-muted text-[12px]">Epic</Label>
                <Select value={epicId} onChange={setEpicId} options={epicOptions} />
              </div>
            ) : (
              <div />
            )}
            
            <div className="space-y-1">
              <Label className="font-semibold text-muted text-[12px]">Assignee</Label>
              <Select value={assignee} onChange={setAssignee} options={assigneeOptions} />
            </div>
            <div className="space-y-1">
              <Label className="font-semibold text-muted text-[12px]">Due date</Label>
              <Input id="wi-due" className="font-semibold h-9" type="date" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            <div className="space-y-1 col-span-2">
              <Label className="font-semibold text-muted text-[12px]">Labels</Label>
              <Input id="wi-label" className="font-semibold h-9" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. frontend, urgent" />
            </div>
          </div>

          {/* Title + Description */}
          <div className="space-y-3 border-t border-border-subtle pt-2">
            <Input
              id="wi-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="h-9 border-none shadow-none px-1 text-lg font-bold focus-visible:ring-0 placeholder:text-[#0c8f8f]/40"
            />

            {/* Rich text editor */}
            <div className="rounded-lg border border-border-subtle bg-panel overflow-visible focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/50 transition-all">
              {/* Toolbar */}
              <div className="relative flex items-center gap-0.5 border-b border-border-subtle bg-panel-strong/30 px-2 py-1">
                {/* Heading */}
                <button type="button" title="Heading" onMouseDown={(e) => { e.preventDefault(); exec("formatBlock", "H3"); }}
                  className={`p-1 rounded transition-colors ${activeFormats.h3 ? "bg-accent/10 text-accent" : "text-muted hover:bg-muted/20"}`}><Heading className="h-3.5 w-3.5" /></button>
                {/* Bold */}
                <button type="button" title="Bold" onMouseDown={(e) => { e.preventDefault(); exec("bold"); }}
                  className={`p-1 rounded transition-colors ${activeFormats.bold ? "bg-accent/10 text-accent" : "text-muted hover:bg-muted/20"}`}><Bold className="h-3.5 w-3.5" /></button>
                {/* Italic */}
                <button type="button" title="Italic" onMouseDown={(e) => { e.preventDefault(); exec("italic"); }}
                  className={`p-1 rounded transition-colors ${activeFormats.italic ? "bg-accent/10 text-accent" : "text-muted hover:bg-muted/20"}`}><Italic className="h-3.5 w-3.5" /></button>
                {/* Underline */}
                <button type="button" title="Underline" onMouseDown={(e) => { e.preventDefault(); exec("underline"); }}
                  className={`p-1 rounded transition-colors ${activeFormats.underline ? "bg-accent/10 text-accent" : "text-muted hover:bg-muted/20"}`}><Underline className="h-3.5 w-3.5" /></button>

                <div className="mx-1 h-3.5 w-px bg-border-subtle" />

                {/* Link */}
                <div className="relative">
                  <button
                    type="button"
                    title="Link"
                    onMouseDown={(e) => { 
                      e.preventDefault(); 
                      saveSelection();
                      const sel = window.getSelection();
                      if (!sel || sel.isCollapsed || sel.toString().trim() === "") return; 
                      setLinkPopover(v => !v); 
                      setImagePopover(false); 
                    }}
                    className={`p-1 rounded transition-colors hover:bg-muted/20 ${linkPopover ? "bg-accent/10 text-accent" : "text-muted"}`}
                  >
                    <Link className="h-3.5 w-3.5" />
                  </button>
                  {linkPopover && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 flex items-center gap-1.5 rounded-lg border border-border-subtle bg-panel px-2 py-1.5 shadow-lg min-w-[240px]">
                      <input
                        ref={linkInputRef}
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } if (e.key === "Escape") setLinkPopover(false); }}
                        placeholder="Insert link…"
                        className="flex-1 bg-transparent text-[12px] font-semibold text-foreground placeholder:text-muted outline-none min-w-0"
                      />
                      <button
                        type="button"
                        onClick={applyLink}
                        className="shrink-0 rounded-md bg-[#0c8f8f] px-2 py-0.5 text-[11px] font-bold text-white hover:bg-[#0a7a8a] transition-colors"
                      >
                        Attach
                      </button>
                      <button type="button" onClick={() => setLinkPopover(false)} className="shrink-0 text-muted hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Image */}
                <div className="relative">
                  <button
                    type="button"
                    title="Image"
                    onMouseDown={(e) => { e.preventDefault(); saveSelection(); setImagePopover(v => !v); setLinkPopover(false); }}
                    className={`p-1 rounded text-muted transition-colors hover:bg-muted/20 ${imagePopover ? "bg-accent/10 text-accent" : ""}`}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                  </button>
                  {imagePopover && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 flex flex-col gap-1.5 rounded-lg border border-border-subtle bg-panel p-2 shadow-lg min-w-[240px]">
                      <div className="flex items-center gap-1.5">
                        <input
                          ref={imageInputRef}
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyImageUrl(); } if (e.key === "Escape") setImagePopover(false); }}
                          placeholder="Image URL…"
                          className="flex-1 bg-transparent text-[12px] font-semibold text-foreground placeholder:text-muted outline-none min-w-0"
                        />
                        <button type="button" onClick={applyImageUrl}
                          className="shrink-0 rounded-md bg-[#0c8f8f] px-2 py-0.5 text-[11px] font-bold text-white hover:bg-[#0a7a8a] transition-colors">
                          Insert
                        </button>
                        <button type="button" onClick={() => setImagePopover(false)} className="shrink-0 text-muted hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <button type="button"
                        onClick={() => { saveSelection(); imgFileRef.current?.click(); setImagePopover(false); }}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-foreground transition-colors">
                        <Paperclip className="h-3 w-3" /> Upload from device
                      </button>
                    </div>
                  )}
                </div>

                {/* Quote */}
                <button type="button" title="Quote" onMouseDown={(e) => { e.preventDefault(); exec("formatBlock", "BLOCKQUOTE"); }}
                  className={`p-1 rounded transition-colors ${activeFormats.blockquote ? "bg-accent/10 text-accent" : "text-muted hover:bg-muted/20"}`}><Quote className="h-3.5 w-3.5" /></button>

                {/* Inline Code */}
                <button type="button" title="Code" onMouseDown={applyInlineCode}
                  className={`p-1 rounded transition-colors ${activeFormats.code ? "bg-accent/10 text-accent" : "text-muted hover:bg-muted/20"}`}><Code2 className="h-3.5 w-3.5" /></button>
              </div>

              {/* Editor content */}
              <div
                ref={descRef}
                id="wi-desc"
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => { setDescription(e.currentTarget.innerHTML); checkFormats(); }}
                onKeyUp={checkFormats}
                onMouseUp={checkFormats}
                data-placeholder="Description"
                className="wi-editor w-full min-h-[76px] max-h-48 overflow-y-auto scroll-thin bg-transparent px-3 py-2.5 text-[13px] font-semibold text-foreground outline-none"
              />
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label className="font-semibold text-muted text-[12px]">Attachments</Label>
            <div className="space-y-2">
              {attachments.map((a) => (
                <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border-subtle px-2.5 py-1.5">
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">{a.name}</span>
                  {a.meta && <span className="text-[11px] text-muted">{a.meta}</span>}
                  <button type="button" onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                    className="rounded-md p-0.5 text-muted hover:text-danger transition-colors" aria-label="Remove attachment">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-subtle text-[13px] font-semibold text-muted transition-colors hover:border-accent hover:text-foreground">
                <Paperclip className="h-5 w-5" />
                <span>Drop files here or click to add attachment</span>
              </button>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
              <input ref={imgFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => applyImageFile(e.target.files)} />
            </div>
          </div>

          <DialogFooter className="mt-2 items-center shrink-0">
            {isEdit && onDelete && (
              <Button type="button" variant="ghost" className="mr-auto font-semibold text-danger hover:bg-danger/10"
                onClick={() => { onDelete(editing!.id); onOpenChange(false); }}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
            <Button type="button" variant="outline" className="font-semibold" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="font-semibold" disabled={!title.trim() || submitting || disabled}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
