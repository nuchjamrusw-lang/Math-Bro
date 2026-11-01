"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "error" | "warning";
interface ToastItem { id: number; message: string; tone: Tone }

const Ctx = React.createContext<(message: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const push = React.useCallback((message: string, tone: Tone = "info") => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-2), { id, message, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16 }}
              className={cn(
                "pointer-events-auto max-w-md rounded-xl border px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-lift)]",
                t.tone === "error" && "border-error/20 bg-error-soft text-error",
                t.tone === "success" && "border-success/20 bg-success-soft text-success",
                t.tone === "warning" && "border-warning/20 bg-warning-soft text-[#a86c12]",
                t.tone === "info" && "border-line bg-surface text-ink",
              )}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => React.useContext(Ctx);
