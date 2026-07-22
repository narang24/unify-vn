import { cn } from "@/lib/utils";

export function Avatar({
  name,
  src,
  size = 24,
  className,
}: {
  name?: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? "avatar"}
        style={{ width: size, height: size }}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground",
        className,
      )}
    >
      {initials || "?"}
    </div>
  );
}
