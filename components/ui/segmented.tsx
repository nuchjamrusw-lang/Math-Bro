"use client";
import { cn } from "@/lib/utils";

export interface SegOption<T extends string> { value: T; label: string; hint?: string; disabled?: boolean }

/** Card-style option picker used throughout Create Room. */
export function Segmented<T extends string>({ value, onChange, options, cols = 4, name }: {
  value: T; onChange: (v: T) => void; options: SegOption<T>[]; cols?: number; name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={cn("grid gap-2", cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition cursor-pointer disabled:opacity-40",
              active ? "border-primary bg-primary-soft ring-1 ring-primary" : "border-line bg-surface hover:border-[#d5d9e3]",
            )}
          >
            <span className={cn("text-sm font-semibold", active ? "text-primary" : "text-ink")}>{o.label}</span>
            {o.hint && <span className="mt-0.5 text-xs text-muted">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3 text-left transition hover:border-[#d5d9e3] cursor-pointer"
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className={cn("relative h-6 w-10 shrink-0 rounded-full transition", checked ? "bg-primary" : "bg-[#d9dce4]")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </span>
    </button>
  );
}
