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

type Tab = "create" | "join" | "quick";

export function Lobby() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "create");
  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "create", label: "Create Room", icon: PlusCircle },
    { id: "join", label: "Join Room", icon: LogIn },
    { id: "quick", label: "Quick Match", icon: Zap },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Play</h1>
      <p className="mt-1 text-muted">Create a room for friends, join with a code, or get matched instantly.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-4 flex gap-1 rounded-xl border border-line bg-surface p-1" role="tablist">
            {tabs.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition cursor-pointer", tab === t.id ? "bg-primary text-white" : "text-muted hover:text-ink")}>
                <t.icon className="size-4" /><span className="hidden sm:inline">{t.label}</span><span className="sm:hidden">{t.label.split(" ")[0]}</span>
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
            <h3 className="mt-2 text-sm font-semibold">Practice mode</h3>
            <p className="mt-1 text-xs text-muted">Two players on one device. Perfect for learning the rules.</p>
            <Button variant="secondary" size="sm" className="mt-3" asChild><Link href="/practice">Open practice</Link></Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function JoinRoom() {
  const [code, setCode] = useState("");
  const router = useRouter();
  const valid = /^[A-Z0-9]{6}$/.test(code);
  return (
    <Card className="p-6">
      <h3 className="font-semibold">Enter room code</h3>
      <p className="mt-1 text-sm text-muted">Ask the host for the 6-character code.</p>
      <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (valid) router.push(`/room/${code}`); }}>
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="e.g. K7M2QX" className="h-12 font-mono text-lg tracking-[0.3em]" aria-label="Room code" />
        <Button size="lg" disabled={!valid}>Join</Button>
      </form>
    </Card>
  );
}

function QuickMatch() {
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
  const go = async (t: "1v1" | "2v2") => {
    setSearching(t);
    const r = await request<{ matched: boolean; code?: string; position?: number; needed?: number }>("quick:join", { gameType: t });
    if (!r.ok) { toast(r.error, "error"); setSearching(null); return; }
    if (r.data?.matched && r.data.code) router.push(`/room/${r.data.code}`);
    else setInfo(`${r.data?.position}/${r.data?.needed} players`);
  };
  const cancel = async () => { await request("quick:leave"); setSearching(null); };
  return (
    <Card className="p-6">
      <h3 className="font-semibold">Quick match</h3>
      <p className="mt-1 text-sm text-muted">Standard rules · 22 min · Challenge ON · voice enabled.</p>
      {searching ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-[#f6f7f9] py-10" data-testid="searching">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="font-semibold">Searching for {searching === "1v1" ? "an opponent" : "players"}…</p>
          <p className="text-xs text-muted">{info}</p>
          <Button variant="secondary" size="sm" onClick={cancel}>Cancel</Button>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button size="lg" onClick={() => go("1v1")}><Zap />Find 1 vs 1</Button>
          <Button size="lg" variant="secondary" onClick={() => go("2v2")}><Users />Find 2 vs 2</Button>
        </div>
      )}
    </Card>
  );
}

function PublicRooms() {
  const [rooms, setRooms] = useState<PublicRoomInfo[] | null>(null);
  const load = async () => {
    const r = await request<PublicRoomInfo[]>("rooms:list");
    setRooms(r.ok ? r.data ?? [] : []);
  };
  useEffect(() => { void load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Public rooms</h3>
        <button onClick={load} className="cursor-pointer text-muted hover:text-ink" aria-label="Refresh"><RefreshCw className="size-4" /></button>
      </div>
      <div className="mt-3 space-y-2">
        {rooms === null && <p className="text-xs text-muted">Loading…</p>}
        {rooms?.length === 0 && <p className="text-xs text-muted">No open public rooms right now.</p>}
        {rooms?.map((r) => (
          <Link key={r.code} href={`/room/${r.code}`} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm transition hover:border-primary/40">
            <span><span className="font-semibold">{r.host}</span><span className="block text-xs text-muted">{r.gameType} · {r.timeMode.toLowerCase()} · {r.validation === "STRICT" ? "strict" : "challenge"}</span></span>
            <span className="text-xs font-semibold tabular text-muted">{r.players}/{r.capacity}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
