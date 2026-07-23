import { boardTypeLabel, type BoardKind } from "@/lib/work-item-types";
import { cn } from "@/lib/utils";

const CAPSULE_STYLES: Record<BoardKind, string> = {
  kanban: "bg-accent/12 text-accent",
  scrum: "bg-[#7c5cff]/14 text-[#7c5cff]",
  bugtracker: "bg-danger/12 text-danger",
  custom: "bg-foreground/[0.08] text-muted",
};

export function BoardCapsule({ kind, className }: { kind: BoardKind; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-[1px] text-[9.5px] font-semibold leading-none tracking-wide",
        CAPSULE_STYLES[kind] ?? CAPSULE_STYLES.custom,
        className,
      )}
    >
      {boardTypeLabel(kind)}
    </span>
  );
}
