import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** MagicUI-style overlapping avatar circles. Always renders at least one. */
export function AvatarCircles({
  names,
  size = 24,
  max = 4,
  extraCount,
  className,
}: {
  names: string[];
  size?: number;
  max?: number;
  extraCount?: number;
  className?: string;
}) {
  const shown = names.slice(0, max);
  const overflow = (extraCount ?? Math.max(0, names.length - max));

  return (
    <div className={cn("flex items-center", className)}>
      {shown.map((name, i) => (
        <div
          key={`${name}-${i}`}
          className="rounded-full ring-2 ring-panel"
          style={{ marginLeft: i === 0 ? 0 : -size * 0.34, zIndex: shown.length - i }}
        >
          <Avatar name={name} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="flex items-center justify-center rounded-full bg-foreground/[0.08] font-semibold text-muted ring-2 ring-panel"
          style={{ width: size, height: size, fontSize: size * 0.38, marginLeft: -size * 0.34 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
