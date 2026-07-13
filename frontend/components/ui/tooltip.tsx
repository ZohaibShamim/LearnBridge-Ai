"use client";

import * as RTooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

/** Wrap the app once (or a subtree) so tooltips share timing. */
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <RTooltip.Provider delayDuration={200} skipDelayDuration={300}>
      {children}
    </RTooltip.Provider>
  );
}

/** Icon-button / collapsed-nav label. Library handles keyboard + a11y. */
export function Tooltip({
  content,
  children,
  side = "right",
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={side}
          sideOffset={8}
          className={cn(
            "z-[var(--z-tooltip)] select-none rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-[var(--shadow-md)]",
            "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in data-[state=delayed-open]:zoom-in",
            className
          )}
        >
          {content}
          <RTooltip.Arrow className="fill-slate-900" />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}
