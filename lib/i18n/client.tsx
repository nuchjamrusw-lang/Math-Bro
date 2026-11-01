"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, LOCALE, makeT, type Lang, type TDynFn, type TFn } from "./index";

interface I18nCtx { lang: Lang; locale: string; t: TFn; td: TDynFn; setLang: (l: Lang) => void }
const Ctx = React.createContext<I18nCtx | null>(null);

export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>(initialLang);
  const router = useRouter();
  const value = React.useMemo<I18nCtx>(() => {
    const { t, td } = makeT(lang);
    return {
      lang, locale: LOCALE[lang], t, td,
      setLang: (l) => {
        document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = l;
        setLangState(l);
        router.refresh(); // re-render server components in the new language
      },
    };
  }, [lang, router]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useI18n outside I18nProvider");
  return c;
}
