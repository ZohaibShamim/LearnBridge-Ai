"use client";

import * as RSlider from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

/**
 * Single-thumb range slider on the Radix primitive — keyboard nav, ARIA, and
 * pointer handling come from the library. Brand-gradient fill, soft track.
 */
export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  className,
  ariaLabel,
}: {
  value: number;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      {label}
      <RSlider.Root
        value={[value]}
        onValueChange={(v) => onValueChange(v[0])}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        className="relative flex h-5 w-full touch-none select-none items-center"
      >
        <RSlider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-slate-200">
          <RSlider.Range className="absolute h-full brand-gradient" />
        </RSlider.Track>
        <RSlider.Thumb
          className="block h-5 w-5 rounded-full border-2 border-blue-600 bg-white shadow-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-95"
        />
      </RSlider.Root>
    </div>
  );
}
