import { cn } from "@/lib/utils";
import { Card } from "./card";

/**
 * Icon chip + label + big number (DESIGN.md §stat tiles). Chip color only
 * differentiates siblings — it is NOT a status signal. Literal-string chip
 * classes so Tailwind keeps them.
 */
export type StatChip = "blue" | "green" | "orange" | "purple" | "amber" | "indigo";

const chips: Record<StatChip, string> = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  orange: "bg-orange-100 text-orange-600",
  purple: "bg-purple-100 text-purple-600",
  amber: "bg-amber-100 text-amber-600",
  indigo: "bg-indigo-100 text-indigo-600",
};

export function StatTile({
  icon,
  chip = "blue",
  label,
  value,
  hint,
  className,
}: {
  icon: React.ReactNode;
  chip?: StatChip;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-5", className)}>
      <div className={cn("mb-4 flex h-11 w-11 items-center justify-center rounded-xl", chips[chip])}>
        {icon}
      </div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}
