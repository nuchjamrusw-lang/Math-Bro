"use client";
import * as React from "react";
import type { SessionUser } from "@/lib/auth/session";
import { resetSocket } from "./socket";

interface AuthCtx {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (username: string, password: string) => Promise<string | null>;
  signup: (username: string, password: string) => Promise<string | null>;
  guest: () => Promise<string | null>;
  logout: () => Promise<void>;
}

const Ctx = React.createContext<AuthCtx | null>(null);

/** Returns null on success, otherwise an error code (translated by the caller) or message. */
async function post(url: string, body?: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return r.ok ? null : ((j.code as string) ?? (j.error as string) ?? "GENERIC");
}

export function AuthProvider({ children, initialUser }: { children: React.ReactNode; initialUser: SessionUser | null }) {
  const [user, setUser] = React.useState<SessionUser | null>(initialUser);
  const [loading, setLoading] = React.useState(false);
  const refresh = React.useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/auth/me", { cache: "no-store" }).then((x) => x.json()).catch(() => ({ user: null }));
    setUser(r.user);
    setLoading(false);
    resetSocket();
  }, []);
  const wrap = (fn: (...a: string[]) => Promise<string | null>) => async (...a: string[]) => {
    const err = await fn(...a);
    if (!err) await refresh();
    return err;
  };
  const value: AuthCtx = {
    user, loading, refresh,
    login: wrap((u, p) => post("/api/auth/login", { username: u, password: p })),
    signup: wrap((u, p) => post("/api/auth/signup", { username: u, password: p })),
    guest: wrap(() => post("/api/auth/guest")),
    logout: async () => { await post("/api/auth/logout"); await refresh(); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
