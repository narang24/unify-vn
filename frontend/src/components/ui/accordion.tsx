"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Context ──────────────────────────────────────────────────────────── */
interface AccordionContextValue {
  type: "single" | "multiple";
  value: string[];
  toggle: (val: string) => void;
}
const AccordionContext = React.createContext<AccordionContextValue>({
  type: "multiple",
  value: [],
  toggle: () => {},
});

/* ── Accordion ────────────────────────────────────────────────────────── */
interface AccordionProps {
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (val: string | string[]) => void;
  className?: string;
  children: React.ReactNode;
}

function Accordion({
  type = "multiple",
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
}: AccordionProps) {
  const normalize = (v: string | string[] | undefined): string[] => {
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
  };

  const [internalValue, setInternalValue] = React.useState<string[]>(
    normalize(defaultValue),
  );

  const value = controlledValue !== undefined ? normalize(controlledValue) : internalValue;

  const toggle = (val: string) => {
    let next: string[];
    if (type === "single") {
      next = value.includes(val) ? [] : [val];
    } else {
      next = value.includes(val) ? value.filter((v) => v !== val) : [...value, val];
    }
    if (!controlledValue) setInternalValue(next);
    onValueChange?.(type === "single" ? (next[0] ?? "") : next);
  };

  return (
    <AccordionContext.Provider value={{ type, value, toggle }}>
      <div className={cn("space-y-1", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

/* ── AccordionItem ────────────────────────────────────────────────────── */
interface AccordionItemProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

const AccordionItemContext = React.createContext<{ value: string; open: boolean }>({
  value: "",
  open: false,
});

function AccordionItem({ value, className, children }: AccordionItemProps) {
  const ctx = React.useContext(AccordionContext);
  const open = ctx.value.includes(value);

  return (
    <AccordionItemContext.Provider value={{ value, open }}>
      <div
        className={cn("border border-border-subtle rounded-lg overflow-hidden", className)}
        data-state={open ? "open" : "closed"}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

/* ── AccordionTrigger ─────────────────────────────────────────────────── */
interface AccordionTriggerProps {
  className?: string;
  children: React.ReactNode;
}

function AccordionTrigger({ className, children }: AccordionTriggerProps) {
  const { value, open } = React.useContext(AccordionItemContext);
  const { toggle } = React.useContext(AccordionContext);

  return (
    <button
      type="button"
      onClick={() => toggle(value)}
      className={cn(
        "flex w-full items-center justify-between text-left transition-all",
        className,
      )}
      aria-expanded={open}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
          open && "rotate-180",
        )}
      />
    </button>
  );
}

/* ── AccordionContent ─────────────────────────────────────────────────── */
interface AccordionContentProps {
  className?: string;
  children: React.ReactNode;
}

function AccordionContent({ className, children }: AccordionContentProps) {
  const { open } = React.useContext(AccordionItemContext);
  const ref = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState<number | undefined>(open ? undefined : 0);

  React.useEffect(() => {
    if (!ref.current) return;
    if (open) {
      setHeight(ref.current.scrollHeight);
      const t = setTimeout(() => setHeight(undefined), 250);
      return () => clearTimeout(t);
    } else {
      setHeight(ref.current.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
    }
  }, [open]);

  return (
    <div
      style={{ height, overflow: "hidden", transition: "height 0.22s ease" }}
    >
      <div ref={ref} className={cn("", className)}>
        {children}
      </div>
    </div>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
