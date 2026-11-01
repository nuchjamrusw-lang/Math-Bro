"use client";
import { Languages } from "lucide-react";
import { LANGS, LANG_LABEL, isLang } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Native <select> (great on iPad/phones) styled as a compact pill. */
export function LanguageSwitcher({ className, compact }: { className?: string; compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  return (
    <label className={cn("relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 text-sm font-medium text-ink transition hover:border-[#d5d9e3]", className)}>
      <Languages className="size-4 text-muted" aria-hidden />
      <span className={cn(compact && "hidden sm:inline")}>{LANG_LABEL[lang]}</span>
      <select
        aria-label={t("lang.label")}
        value={lang}
        onChange={(e) => isLang(e.target.value) && setLang(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        data-testid="language-select"
      >
        {LANGS.map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
      </select>
    </label>
  );
}
