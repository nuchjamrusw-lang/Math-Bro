"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/client/auth";

/** Gate for multiplayer pages: log in, sign up or continue as guest. */
export function RequireUser({ children }: { children: React.ReactNode }) {
  const { user, guest } = useAuth();
  const path = usePathname();
  const [busy, setBusy] = useState(false);
  if (user) return <>{children}</>;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold">Who&apos;s playing?</h1>
        <p className="mt-2 text-sm text-muted">Log in to save stats and history, or jump in as a guest.</p>
        <div className="mt-6 flex flex-col gap-2">
          <Button size="lg" disabled={busy} onClick={async () => { setBusy(true); await guest(); setBusy(false); }} data-testid="guest-btn">Continue as guest</Button>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" asChild><Link href={`/login?next=${encodeURIComponent(path)}`}>Log in</Link></Button>
            <Button variant="secondary" className="flex-1" asChild><Link href={`/signup?next=${encodeURIComponent(path)}`}>Sign up</Link></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
