"use client";

import { Drawer as Vaul } from "vaul";
import { cn } from "@/lib/utils";

/**
 * Drag-to-dismiss drawer on Vaul. Used for the mobile nav and side panels —
 * momentum, focus trap, and scroll lock come from the library.
 * `side="left"` for nav, `side="bottom"` for mobile sheets, `side="right"` for detail panels.
 */
export function Drawer({
  open,
  onOpenChange,
  side = "left",
  children,
  className,
  ariaLabel,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  side?: "left" | "right" | "bottom";
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const direction = side === "bottom" ? "bottom" : side;
  const position =
    side === "bottom"
      ? "inset-x-0 bottom-0 mt-24 max-h-[85vh] rounded-t-3xl"
      : side === "right"
      ? "inset-y-0 right-0 w-[min(88vw,22rem)] rounded-l-3xl"
      : "inset-y-0 left-0 w-[min(84vw,18rem)] rounded-r-3xl";

  return (
    <Vaul.Root open={open} onOpenChange={onOpenChange} direction={direction}>
      <Vaul.Portal>
        <Vaul.Overlay className="fixed inset-0 z-[var(--z-drawer-backdrop)] bg-slate-900/50 backdrop-blur-sm" />
        <Vaul.Content
          aria-label={ariaLabel}
          className={cn(
            "fixed z-[var(--z-drawer)] flex flex-col bg-white shadow-[var(--shadow-lg)] focus:outline-none",
            position,
            className
          )}
        >
          {side === "bottom" && (
            <div className="mx-auto mt-3 h-1.5 w-10 flex-shrink-0 rounded-full bg-slate-300" />
          )}
          <Vaul.Title className="sr-only">{ariaLabel || "Panel"}</Vaul.Title>
          {children}
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}
