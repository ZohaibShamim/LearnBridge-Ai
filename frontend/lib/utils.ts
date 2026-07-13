import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class lists, resolving conflicts (later wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
