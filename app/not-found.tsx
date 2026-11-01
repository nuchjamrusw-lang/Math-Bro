import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div><p className="text-6xl font-bold text-primary">404</p><p className="mt-2 text-muted">{t("notFound.text")}</p><Button className="mt-6" asChild><Link href="/">{t("notFound.home")}</Link></Button></div>
    </div>
  );
}
