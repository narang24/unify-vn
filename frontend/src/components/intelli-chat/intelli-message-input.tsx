"use client";

import { Loader2, SendHorizontal } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shared, compact composer used by all three Unify Intelli chat surfaces. */
export function IntelliMessageInput({
  value,
  onChange,
  onSend,
  sending,
  placeholder = "Ask Unify Intelli…",
  className,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  sending?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-end gap-1.5 rounded-xl border border-border-subtle bg-panel p-1.5 shadow-sm",
        className,
      )}
    >
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!sending && value.trim()) onSend();
          }
        }}
        rows={1}
        autoFocus={autoFocus}
        placeholder={placeholder}
        maxHeight={128}
        className="max-h-32 flex-1 border-0 bg-transparent px-2 py-1.5 text-[13px] shadow-none focus-visible:ring-0"
        disabled={sending}
      />
      <Button
        size="icon"
        onClick={onSend}
        disabled={!value.trim() || sending}
        className="h-8 w-8 shrink-0 rounded-full"
        aria-label="Send message"
      >
        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizontal className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
