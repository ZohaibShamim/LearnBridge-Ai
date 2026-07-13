"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The three commitment tiers from DESIGN.md, plus ghost/outline for chrome.
 * - primary:     the one forward action per screen (brand gradient + glow)
 * - secondary:   a real, lower-commitment action beside a primary one
 * - destructive: solid red, always paired with a confirmation modal
 */
type Variant = "primary" | "secondary" | "destructive" | "ghost" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "tap inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap " +
  "rounded-xl transition-all duration-200 select-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-60 active:scale-[0.97]";

const variants: Record<Variant, string> = {
  primary:
    "text-white brand-gradient shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:brightness-[1.05]",
  secondary:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-200",
  destructive:
    "bg-red-600 text-white shadow-lg shadow-red-500/20 hover:bg-red-700 hover:shadow-red-500/30",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  outline:
    "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
  icon: "h-10 w-10 p-0",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, disabled, children, ...props },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
