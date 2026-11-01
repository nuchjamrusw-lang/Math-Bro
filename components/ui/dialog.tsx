"use client";
import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({ className, children, hideClose, ...p }: React.ComponentProps<typeof D.Content> & { hideClose?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-[#20232b]/30 backdrop-blur-[2px] data-[state=open]:animate-[pop_150ms_ease-out]" />
      <D.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-lift)] focus:outline-none",
          className,
        )}
        aria-describedby={undefined}
        {...p}
      >
        {children}
        {!hideClose && (
          <D.Close className="absolute right-4 top-4 rounded-lg p-1 text-muted transition hover:bg-[#eef0f4] hover:text-ink cursor-pointer" aria-label="Close">
            <X className="size-4" />
          </D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}

export function DialogTitle({ className, ...p }: React.ComponentProps<typeof D.Title>) {
  return <D.Title className={cn("text-lg font-semibold tracking-tight", className)} {...p} />;
}
export function DialogDescription({ className, ...p }: React.ComponentProps<typeof D.Description>) {
  return <D.Description className={cn("mt-1 text-sm text-muted", className)} {...p} />;
}
export function DialogFooter({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...p} />;
}
