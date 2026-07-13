"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Centered modal on a Radix Dialog primitive — focus trap, escape, scroll
 * lock, and a11y come from Radix; we only style the surface (DESIGN.md §modals).
 * Scrim: slate-900/50 + blur. Panel: white rounded-2xl/3xl, rise-in entrance.
 */
export function Modal({
  open,
  onOpenChange,
  children,
  className,
  size = "md",
  showClose = true,
  labelledBy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  showClose?: boolean;
  labelledBy?: string;
}) {
  const width = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" }[size];
  const radius = size === "lg" ? "rounded-3xl" : "rounded-2xl";
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-slate-900/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in"
        />
        <Dialog.Content
          aria-labelledby={labelledBy}
          className={cn(
            "fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2",
            "bg-white shadow-[var(--shadow-lg)] focus:outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in",
            width,
            radius,
            className
          )}
        >
          {children}
          {showClose && (
            <Dialog.Close
              aria-label="Close"
              className="tap absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Icon-circle-first header — blue for informational, red for destructive. */
export function ModalIcon({
  tone = "brand",
  children,
}: {
  tone?: "brand" | "danger" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    brand: "bg-blue-100 text-blue-600",
    danger: "bg-red-100 text-red-600",
    success: "bg-green-100 text-green-600",
  }[tone];
  return (
    <div className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-full", styles)}>
      {children}
    </div>
  );
}

export const ModalTitle = Dialog.Title;
export const ModalDescription = Dialog.Description;
export const ModalClose = Dialog.Close;
