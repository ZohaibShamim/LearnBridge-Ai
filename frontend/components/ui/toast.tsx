"use client";

import { Toaster as Sonner, toast } from "sonner";

/**
 * App-wide toast host (mount once in layout). Replaces the per-page hand-rolled
 * Toast copies. DESIGN.md: top-right, solid success/error, ~4s auto-dismiss.
 * Use for the result of an action the user just took — not ambient status.
 */
export function Toaster() {
  return (
    <Sonner
      position="top-right"
      duration={4000}
      gap={10}
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !shadow-[var(--shadow-lg)] !text-sm !font-medium !px-4 !py-3 !gap-2.5",
          success: "!bg-green-600 !border-green-500 !text-white",
          error: "!bg-red-600 !border-red-500 !text-white",
          info: "!bg-slate-900 !border-slate-800 !text-white",
          title: "!font-semibold",
          description: "!text-white/90",
          icon: "!text-white",
        },
      }}
    />
  );
}

export { toast };
