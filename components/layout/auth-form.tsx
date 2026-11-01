"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/client/auth";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { login, signup, guest } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/play";
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await (mode === "login" ? login(u, p) : signup(u, p));
    setBusy(false);
    if (r) setErr(r); else router.push(next);
  };
  const asGuest = async () => {
    setBusy(true);
    const r = await guest();
    setBusy(false);
    if (r) setErr(r); else router.push(next);
  };
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-1 text-sm text-muted">{mode === "login" ? "Log in to keep your stats and match history." : "Track wins, scores and replays across devices."}</p>
      <Card className="mt-6 p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="u">Username</Label><Input id="u" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required /></div>
          <div className="space-y-1.5"><Label htmlFor="p">Password</Label><Input id="p" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></div>
          {err && <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error" role="alert">{err}</p>}
          <Button className="w-full" size="lg" disabled={busy}>{mode === "login" ? "Log in" : "Sign up"}</Button>
        </form>
        <div className="my-4 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
        <Button variant="secondary" className="w-full" onClick={asGuest} disabled={busy}>Continue as guest</Button>
      </Card>
      <p className="mt-4 text-center text-sm text-muted">
        {mode === "login" ? <>New here? <Link className="font-semibold text-primary" href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link></> : <>Already have an account? <Link className="font-semibold text-primary" href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link></>}
      </p>
    </div>
  );
}
