import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Consistent loading spinner. Centered full-height variant via `page`. */
export function Spinner({
  className,
  page,
  label,
}: {
  className?: string;
  page?: boolean;
  label?: string;
}) {
  const icon = <Loader2 className={cn("h-6 w-6 animate-spin text-blue-600", className)} aria-hidden />;
  if (!page) return icon;
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3" role="status">
      {icon}
      {label && <p className="text-sm font-medium text-slate-500">{label}</p>}
      <span className="sr-only">Loading</span>
    </div>
  );
}
