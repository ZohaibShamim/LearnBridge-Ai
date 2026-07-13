import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Soft-elevation surface (DESIGN.md §5: shadow over hard lines).
 * `interactive` adds the hover-lift used by browsable card grids.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  as?: "div" | "article" | "section";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, as: Tag = "div", ...props }, ref) => (
    <Tag
      ref={ref as never}
      className={cn(
        "rounded-2xl border border-slate-100 bg-white shadow-[var(--shadow-sm)]",
        interactive &&
          "transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[var(--shadow-lg)]",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-3", className)} {...props} />;
}

/** Pastel rounded-square icon chip that fronts most card/stat headers. */
export function IconChip({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl",
        "bg-blue-100 text-blue-600",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
