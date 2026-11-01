"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Loader2, WifiOff, LogOut } from "lucide-react";
import type { GameView as View } from "@/lib/game-engine";
import type { Ack, GameAction, GameNotice, MemberRole, RoomSnapshot } from "@/lib/protocol";
import { getSocket, request } from "@/lib/client/socket";
import { useAuth } from "@/lib/client/auth";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { GameView } from "@/components/game/game-view";
import { ResultScreen } from "@/components/game/result-screen";
import { VoiceChat } from "@/components/voice-chat/voice-chat";
import { WaitingRoom } from "./waiting-room";
import { LABELS, minutesFor } from "@/lib/room-settings";

export function RoomClient({ code }: { code: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [showResult, setShowResult] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = getSocket();
    const join = async () => {
      const r = await request("room:join", { code });
      if (!r.ok) setError(r.error);
    };
    const onRoom = (r: RoomSnapshot) => r.code === code && setRoom(r);
    const onGame = (p: { view: View }) => { if (p.view.id === code) { setView(p.view); } };
    const onNotice = (n: GameNotice) => toast(n.message, n.kind === "BINGO" ? "success" : n.kind === "TIMEOUT" ? "error" : n.kind === "CHALLENGE" || n.kind === "RULING" ? "warning" : "info");
    const onConnect = () => { setConnected(true); void join(); };
    const onDisconnect = () => setConnected(false);
    s.on("room:state", onRoom);
    s.on("game:state", onGame);
    s.on("game:notice", onNotice);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    if (s.connected) void join();
    return () => {
      s.off("room:state", onRoom); s.off("game:state", onGame); s.off("game:notice", onNotice);
      s.off("connect", onConnect); s.off("disconnect", onDisconnect);
    };
  }, [code, toast]);

  useEffect(() => { if (room?.status === "PLAYING") setShowResult(true); }, [room?.status]);

  const me = user!.uid;
  const member = room?.members.find((m) => m.userId === me);
  const mySide = member?.role === "PLAYER" ? member.side : null;
  const isHost = room?.hostId === me;

  const act = useCallback(async (action: GameAction): Promise<Ack> => {
    if (!view) return { ok: false, error: "No game" };
    const r = await request("game:action", { code, action, version: view.version });
    if (!r.ok && r.code === "STALE") {
      const sync = await request<{ view: View }>("game:sync", { code });
      if (sync.ok && sync.data) setView(sync.data.view);
    }
    return r;
  }, [code, view]);

  const memberMeta = useMemo(() => {
    const m: Record<number, { avatarColor?: string; online?: boolean }> = {};
    for (const side of [0, 1]) {
      const ms = room?.members.filter((x) => x.role === "PLAYER" && x.side === side) ?? [];
      m[side] = { avatarColor: ms[0]?.avatarColor, online: ms.some((x) => x.connected) };
    }
    return m;
  }, [room]);

  const leave = async () => { await request("room:leave", { code }); router.push("/play"); };

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-lg font-semibold">{error}</p>
        <Button className="mt-6" asChild><Link href="/play">Back to lobby</Link></Button>
      </div>
    );
  }
  if (!room) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Logo />
        <button className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 font-mono text-sm font-semibold tracking-widest" onClick={() => { void navigator.clipboard?.writeText(room.code); toast("Room code copied", "success"); }} aria-label="Copy room code">
          {room.code}<Copy className="size-3.5 text-muted" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>{minutesFor(room.settings)} min</Badge>
        <Badge tone={room.settings.validation === "STRICT" ? "warning" : "primary"}>{LABELS.validation[room.settings.validation]}</Badge>
        <Badge className="hidden sm:inline-flex">{LABELS.scoreManagement[room.settings.scoreManagement]}</Badge>
        {!connected && <Badge tone="error"><WifiOff className="size-3" />Reconnecting…</Badge>}
        <Button variant="ghost" size="sm" onClick={leave}><LogOut />Leave</Button>
      </div>
    </header>
  );

  if (room.status === "LOBBY" || !view) {
    return (
      <>
        <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6">{header}</div>
        <WaitingRoom room={room} me={me} busy={busy}
          onSeat={async (side, role: MemberRole) => { const r = await request("room:seat", { code, side, role }); if (!r.ok) toast(r.error, "error"); }}
          onStart={async () => { setBusy(true); const r = await request("room:start", { code }); setBusy(false); if (!r.ok) toast(r.error, "error"); }} />
      </>
    );
  }

  const voiceOn = !room.voiceDisabled;
  return (
    <>
      <GameView
        controller={{ mode: "online", view, mySide, isReferee: member?.role === "REFEREE", act }}
        header={header}
        memberMeta={memberMeta}
        voice={room.settings.voiceEnabled ? (
          <VoiceChat code={code} enabled={voiceOn} isHost={isHost}
            onToggleRoomVoice={async (enabledNow) => { const r = await request("room:voice", { code, disabled: enabledNow }); if (!r.ok) toast(r.error, "error"); }} />
        ) : undefined}
      />
      {view.phase === "FINISHED" && showResult && (
        <ResultScreen
          view={view} mySide={mySide}
          canPlayAgain={isHost}
          onPlayAgain={async () => { const r = await request("room:rematch", { code }); if (!r.ok) toast(r.error, "error"); }}
          onLobby={leave}
          onHistory={() => router.push("/profile")}
          onReplay={room.settings.replayEnabled && room.matchId ? () => router.push(`/replay/${room.matchId}`) : undefined}
          onClose={() => setShowResult(false)}
        />
      )}
      {view.phase === "FINISHED" && !showResult && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2"><Button onClick={() => setShowResult(true)}>Show results</Button></div>
      )}
    </>
  );
}
