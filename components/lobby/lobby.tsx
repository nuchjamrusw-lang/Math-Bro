"use client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Users, Zap, LogIn, PlusCircle, GraduationCap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getSocket, request } from "@/lib/client/socket";
import type { PublicRoomInfo } from "@/lib/protocol";
import { CreateRoom } from "./create-room";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { ackError } from "@/lib/i18n/format";

type Tab = "create" | "join" | "quick";

export function Lobby() {
  const { t } = useI18n();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "create");
  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "create", label: t("tab.create"), icon: PlusCircle },
    { id: "join", label: t("tab.join"), icon: LogIn },
    { id: "quick", label: t("tab.quick"), icon: Zap },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("lobby.title")}</h1>
      <p className="mt-1 text-muted">{t("lobby.sub")}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-4 flex gap-1 rounded-xl border border-line bg-surface p-1" role="tablist">
            {tabs.map((tb) => (
              <button key={tb.id} role="tab" aria-selected={tab === tb.id} onClick={() => setTab(tb.id)}
                className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition cursor-pointer", tab === tb.id ? "bg-primary text-white" : "text-muted hover:text-ink")}>
                <tb.icon className="size-4 shrink-0" /><span className="truncate">{tb.label}</span>
              </button>
            ))}
          </div>
          {tab === "create" && <CreateRoom />}
          {tab === "join" && <JoinRoom />}
          {tab === "quick" && <QuickMatch />}
        </div>
        <div className="space-y-4">
          <PublicRooms />
          <Card className="p-5">
            <GraduationCap className="size-5 text-primary" />
            <h3 className="mt-2 text-sm font-semibold">{t("practiceCard.title")}</h3>
            <p className="mt-1 text-xs text-muted">{t("practiceCard.desc")}</p>
            <Button variant="secondary" size="sm" className="mt-3" asChild><Link href="/practice">{t("practiceCard.open")}</Link></Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function JoinRoom() {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const router = useRouter();
  const valid = /^[A-Z0-9]{6}$/.test(code);
  return (
    <Card className="p-6">
      <h3 className="font-semibold">{t("join.title")}</h3>
      <p className="mt-1 text-sm text-muted">{t("join.sub")}</p>
      <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (valid) router.push(`/room/${code}`); }}>
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder={t("join.placeholder")} className="h-12 font-mono text-lg tracking-[0.3em]" aria-label={t("join.aria")} />
        <Button size="lg" disabled={!valid}>{t("join.btn")}</Button>
      </form>
    </Card>
  );
}

function QuickMatch() {
  const { t, td } = useI18n();
  const [searching, setSearching] = useState<null | "1v1" | "2v2">(null);
  const [info, setInfo] = useState<string>("");
  const router = useRouter();
  const toast = useToast();
  useEffect(() => {
    const s = getSocket();
    const onMatch = (p: { code: string }) => router.push(`/room/${p.code}`);
    s.on("quick:matched", onMatch);
    return () => { s.off("quick:matched", onMatch); };
  }, [router]);
  useEffect(() => () => { void request("quick:leave"); }, []);
  const go = async (gameType: "1v1" | "2v2") => {
    setSearching(gameType);
    const r = await request<{ matched: boolean; code?: string; position?: number; needed?: number }>("quick:join", { gameType });
    if (!r.ok) { toast(ackError(td, r), "error"); setSearching(null); return; }
    if (r.data?.matched && r.data.code) router.push(`/room/${r.data.code}`);
    else setInfo(t("quick.players", { n: r.data?.position ?? 0, m: r.data?.needed ?? 0 }));
  };
  const cancel = async () => { await request("quick:leave"); setSearching(null); };
  return (
    <Card className="p-6">
      <h3 className="font-semibold">{t("quick.title")}</h3>
      <p className="mt-1 text-sm text-muted">{t("quick.sub")}</p>
      {searching ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-[#f6f7f9] py-10" data-testid="searching">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="font-semibold">{searching === "1v1" ? t("quick.searching1") : t("quick.searching2")}</p>
          <p className="text-xs text-muted">{info}</p>
          <Button variant="secondary" size="sm" onClick={cancel}>{t("quick.cancel")}</Button>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button size="lg" onClick={() => go("1v1")}><Zap />{t("quick.find1")}</Button>
          <Button size="lg" variant="secondary" onClick={() => go("2v2")}><Users />{t("quick.find2")}</Button>
        </div>
      )}
    </Card>
  );
}

function PublicRooms() {
  const { t, td } = useI18n();
  const [rooms, setRooms] = useState<PublicRoomInfo[] | null>(null);
  const load = async () => {
    const r = await request<PublicRoomInfo[]>("rooms:list");
    setRooms(r.ok ? r.data ?? [] : []);
  };
  useEffect(() => { void load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("public.title")}</h3>
        <button onClick={load} className="cursor-pointer text-muted hover:text-ink" aria-label={t("public.refresh")}><RefreshCw className="size-4" /></button>
      </div>
      <div className="mt-3 space-y-2">
        {rooms === null && <p className="text-xs text-muted">{t("public.loading")}</p>}
        {rooms?.length === 0 && <p className="text-xs text-muted">{t("public.empty")}</p>}
        {rooms?.map((r) => (
          <Link key={r.code} href={`/room/${r.code}`} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm transition hover:border-primary/40">
            <span><span className="font-semibold">{r.host}</span><span className="block text-xs text-muted">{r.gameType} · {td(`time.${r.timeMode}`)} · {r.validation === "STRICT" ? t("public.strict") : t("public.challenge")}</span></span>
            <span className="text-xs font-semibold tabular text-muted">{r.players}/{r.capacity}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
