import { cn } from "@/lib/utils";

/**
 * Pills. Pastel bg + saturated text of the SAME hue (DESIGN.md §badges).
 * Tone is decodable without reading the text. All classes are literal
 * strings (never interpolated) so Tailwind keeps them in the build.
 */
export type BadgeTone =
  | "brand"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "purple"
  | "orange";

const tones: Record<BadgeTone, string> = {
  brand: "bg-blue-100 text-blue-700",
  neutral: "bg-slate-100 text-slate-600",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
};

/** difficulty → tone (DESIGN.md: easy=green, medium=yellow, hard=red). */
export const difficultyTone: Record<string, BadgeTone> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
  beginner: "success",
  intermediate: "warning",
  advanced: "danger",
};

/** grade → tone (A=green, B=blue, C=yellow, D=orange, F=red). */
export const gradeTone: Record<string, BadgeTone> = {
  A: "success",
  B: "brand",
  C: "warning",
  D: "orange",
  F: "danger",
};

export function Badge({
  tone = "neutral",
  className,
  icon,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; icon?: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
