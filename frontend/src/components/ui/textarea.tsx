"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Auto-grows the textarea height to fit its content, up to `maxHeight`. */
  autoGrow?: boolean;
  maxHeight?: number;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoGrow = true, maxHeight = 160, onInput, value, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      },
      [ref],
    );

    const resize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el || !autoGrow) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    }, [autoGrow, maxHeight]);

    React.useEffect(() => {
      resize();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
      <textarea
        ref={setRefs}
        value={value}
        onInput={(e) => {
          resize();
          onInput?.(e);
        }}
        className={cn(
          "flex w-full resize-none rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--panel)] px-3 py-2 text-[13px] text-[color:var(--foreground)] transition placeholder:text-[color:var(--muted)] focus-visible:outline-none focus-visible:border-[color:var(--accent)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/25 disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
