import { Logo } from "./logo";
import { getT } from "@/lib/i18n/server";

export async function Footer() {
  const { t } = await getT();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
        <Logo />
        <p>{t("footer.tagline")}</p>
        <p>© {new Date().getFullYear()} Math&amp;Bro</p>
      </div>
    </footer>
  );
}
