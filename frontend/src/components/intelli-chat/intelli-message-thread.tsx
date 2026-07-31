"use client";

import { forwardRef } from "react";
import { AlertTriangle, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMessageTime, type IntelliChatMessage } from "@/lib/intelli-types";

/** Three animated dots — shown in place of content while a reply is pending. */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-60"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

/** Shared message list used by all three Unify Intelli chat surfaces. */
export const IntelliMessageThread = forwardRef<
  HTMLDivElement,
  {
    messages: IntelliChatMessage[];
    compact?: boolean;
    className?: string;
  }
>(function IntelliMessageThread({ messages, compact = true, className }, bottomRef) {
  return (
    <div className={cn("flex flex-col", compact ? "gap-2.5" : "gap-3.5", className)}>
      {messages.map((m) => {
        const isUser = m.role === "user";
        return (
          <div key={m.id} className={cn("flex w-full gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
            <div
              className={cn(
                "mt-0.5 flex shrink-0 items-center justify-center rounded-full",
                compact ? "h-6 w-6" : "h-7 w-7",
                isUser ? "bg-gradient-to-br from-slate-600 to-slate-800 text-white" : "bg-accent/12 text-accent ring-1 ring-accent/20",
              )}
            >
              {isUser ? (
                <User className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
              ) : m.error ? (
                <AlertTriangle className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
              ) : (
                <Bot className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
              )}
            </div>
            <div className={cn("flex max-w-[85%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap",
                  isUser
                    ? "bg-accent font-semibold text-white"
                    : m.error
                      ? "border border-red-500/30 bg-red-500/[0.06] text-foreground"
                      : "border border-border-subtle bg-panel-strong/30 text-foreground",
                )}
              >
                {m.pending ? <TypingDots /> : m.content}
              </div>
              {!m.pending && (m.createdAt || m.error) && (
                <span className={cn("px-1 text-[10.5px] text-muted", m.error && "text-red-500/80 font-medium")}>
                  {m.error ? "Failed to send — try again" : formatMessageTime(m.createdAt)}
                </span>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
});
