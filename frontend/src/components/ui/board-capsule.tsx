import { boardTypeLabel, type BoardKind } from "@/lib/work-item-types";
import { cn } from "@/lib/utils";

const CAPSULE_STYLES: Record<BoardKind, string> = {
  kanban: "bg-[#001D51]/15 text-[#001D51] dark:bg-[#60a5fa]/15 dark:text-[#60a5fa]",
  scrum: "bg-[#7c5cff]/14 text-[#7c5cff]",
  bugtracker: "bg-danger/12 text-danger",
  custom: "bg-foreground/[0.08] text-muted",
};

export function BoardCapsule({ kind, className }: { kind: BoardKind; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2.5 py-1 text-[11px] font-bold leading-none tracking-wide",
        CAPSULE_STYLES[kind] ?? CAPSULE_STYLES.custom,
        className,
      )}
    >
      {boardTypeLabel(kind)}
    </span>
  );
}
