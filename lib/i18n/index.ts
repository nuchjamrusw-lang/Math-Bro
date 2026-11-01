/** Tiny type-safe i18n: flat dictionaries, `{param}` interpolation, cookie-based language choice. */
import { en, type Dict, type MsgKey } from "./en";
import { th } from "./th";
import { zh } from "./zh";

export type { MsgKey, Dict };
export const LANGS = ["th", "en", "zh"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "th";
export const LANG_COOKIE = "mb_lang";
export const LANG_LABEL: Record<Lang, string> = { th: "ไทย", en: "English", zh: "中文" };
export const LOCALE: Record<Lang, string> = { th: "th-TH", en: "en-US", zh: "zh-CN" };

const DICTS: Record<Lang, Dict> = { en, th, zh };

export type Params = Record<string, string | number | undefined>;
export type TFn = (key: MsgKey, params?: Params) => string;
/** Dynamic lookup for keys built at runtime (error codes, …). Returns `fallback` if unknown. */
export type TDynFn = (key: string, params?: Params, fallback?: string) => string;

function interpolate(s: string, p?: Params) {
  return p ? s.replace(/\{(\w+)\}/g, (m, k) => (p[k] === undefined ? m : String(p[k]))) : s;
}

export function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (LANGS as readonly string[]).includes(x);
}

export function makeT(lang: Lang): { t: TFn; td: TDynFn } {
  const dict = DICTS[lang] ?? en;
  const t: TFn = (key, params) => interpolate(dict[key] ?? en[key] ?? key, params);
  const td: TDynFn = (key, params, fallback) => {
    const s = (dict as Record<string, string>)[key] ?? (en as Record<string, string>)[key];
    return s === undefined ? fallback ?? key : interpolate(s, params);
  };
  return { t, td };
}

/** Choose a language: explicit cookie first, then the browser's Accept-Language, then Thai. */
export function pickLang(cookie: string | undefined, acceptLanguage: string | null | undefined): Lang {
  if (isLang(cookie)) return cookie;
  for (const part of (acceptLanguage ?? "").split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (isLang(code)) return code;
  }
  return DEFAULT_LANG;
}
