import { cn } from "@/lib/utils";

/**
 * h-2 track + brand gradient fill (DESIGN.md §progress bars). Always paired
 * with a numeric readout by the caller — the bar is magnitude, not precision.
 * `tone="success"` for a completed track (green), else brand.
 */
export function Progress({
  value,
  tone = "brand",
  className,
  barClassName,
}: {
  value: number;
  tone?: "brand" | "success";
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "success"
            ? "bg-gradient-to-r from-green-500 to-emerald-500"
            : "brand-gradient",
          barClassName
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
