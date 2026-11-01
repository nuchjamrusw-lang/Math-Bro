"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/client/auth";
import { useI18n } from "@/lib/i18n/client";

/** Gate for multiplayer pages: log in, sign up or continue as guest. */
export function RequireUser({ children }: { children: React.ReactNode }) {
  const { user, guest } = useAuth();
  const { t } = useI18n();
  const path = usePathname();
  const [busy, setBusy] = useState(false);
  if (user) return <>{children}</>;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold">{t("gate.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("gate.sub")}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Button size="lg" disabled={busy} onClick={async () => { setBusy(true); await guest(); setBusy(false); }} data-testid="guest-btn">{t("auth.guest")}</Button>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" asChild><Link href={`/login?next=${encodeURIComponent(path)}`}>{t("nav.login")}</Link></Button>
            <Button variant="secondary" className="flex-1" asChild><Link href={`/signup?next=${encodeURIComponent(path)}`}>{t("nav.signup")}</Link></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
