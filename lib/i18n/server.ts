import { cookies, headers } from "next/headers";
import { LANG_COOKIE, LOCALE, makeT, pickLang, type Lang } from "./index";

export async function getLang(): Promise<Lang> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  return pickLang(c.get(LANG_COOKIE)?.value, h.get("accept-language"));
}

export async function getT() {
  const lang = await getLang();
  return { lang, locale: LOCALE[lang], ...makeT(lang) };
}
