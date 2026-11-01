"use client";
import { useState } from "react";
import { Copy, Check, Crown, Eye, Gavel, Play, UserPlus, WifiOff } from "lucide-react";
import type { RoomSnapshot, MemberRole } from "@/lib/protocol";
import { LABELS, minutesFor } from "@/lib/room-settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/layout/avatar";
import { cn } from "@/lib/utils";

export function WaitingRoom({ room, me, onSeat, onStart, busy }: {
  room: RoomSnapshot; me: string; busy?: boolean;
  onSeat: (side: number | null, role: MemberRole) => void; onStart: () => void;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const isHost = room.hostId === me;
  const self = room.members.find((m) => m.userId === me);
  const copy = async (what: "code" | "link") => {
    const text = what === "code" ? room.code : `${location.origin}/room/${room.code}`;
    await navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  };
  const sides = [0, 1].map((s) => room.members.filter((m) => m.role === "PLAYER" && m.side === s));
  const ready = sides.every((s) => s.length === room.seatsPerSide);
  const others = room.members.filter((m) => m.role !== "PLAYER");
  const s = room.settings;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Card className="p-6 text-center">
        <p className="text-sm text-muted">Room code</p>
        <button onClick={() => copy("code")} className="mt-1 inline-flex cursor-pointer items-center gap-3 font-mono text-4xl font-bold tracking-[0.25em] text-ink" data-testid="room-code">
          {room.code}{copied === "code" ? <Check className="size-5 text-success" /> : <Copy className="size-5 text-muted" />}
        </button>
        <div className="mt-3"><Button variant="soft" size="sm" onClick={() => copy("link")}><UserPlus />{copied === "link" ? "Link copied!" : "Copy invite link"}</Button></div>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {sides.map((members, side) => (
          <Card key={side} className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{room.seatsPerSide > 1 ? `Team ${side === 0 ? "A" : "B"}` : `Player ${side === 0 ? "A" : "B"}`}</h3>
              <span className="text-xs text-muted tabular">{members.length}/{room.seatsPerSide}</span>
            </div>
            <div className="mt-3 space-y-2">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-3 rounded-xl bg-[#f6f7f9] px-3 py-2.5">
                  <Avatar name={m.username} color={m.avatarColor} size={32} />
                  <span className="flex-1 truncate text-sm font-medium">{m.username}{m.userId === me && <span className="ml-1 text-primary">(you)</span>}</span>
                  {m.isHost && <Crown className="size-4 text-warning" aria-label="Host" />}
                  {!m.connected && <WifiOff className="size-4 text-muted" aria-label="Offline" />}
                </div>
              ))}
              {Array.from({ length: room.seatsPerSide - members.length }).map((_, i) => (
                <button key={i} onClick={() => onSeat(side, "PLAYER")} className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-line px-3 py-3 text-sm text-muted transition hover:border-primary/50 hover:text-primary">
                  {self?.side === side && self.role === "PLAYER" ? "Waiting for player…" : "Take this seat"}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <h3 className="font-semibold">Spectators &amp; referee</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {others.length === 0 && <p className="text-sm text-muted">Nobody yet.</p>}
            {others.map((m) => (
              <span key={m.userId} className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f3f7] px-3 py-1 text-xs font-medium">
                {m.role === "REFEREE" ? <Gavel className="size-3.5 text-primary" /> : <Eye className="size-3.5 text-muted" />}{m.username}
              </span>
            ))}
          </div>
          {room.settings.allowSpectators && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => onSeat(null, "SPECTATOR")} disabled={self?.role === "SPECTATOR"}><Eye />Spectate</Button>
              <Button variant="secondary" size="sm" onClick={() => onSeat(null, "REFEREE")} disabled={self?.role === "REFEREE"}><Gavel />Be referee</Button>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">Settings</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="primary">{s.gameType === "1v1" ? "1 vs 1" : "2 vs 2"}</Badge>
            <Badge>{minutesFor(s)} min / side</Badge>
            <Badge>{s.timeoutBehavior === "OVERTIME_PENALTY" ? "Overtime −10/min" : "End on timeout"}</Badge>
            <Badge>{LABELS.scoreManagement[s.scoreManagement]}</Badge>
            <Badge tone={s.validation === "STRICT" ? "warning" : "primary"}>{LABELS.validation[s.validation]}</Badge>
            <Badge>{s.voiceEnabled ? "Voice on" : "Voice off"}</Badge>
            <Badge>{s.privacy === "PUBLIC" ? "Public" : "Private"}</Badge>
            {s.replayEnabled && <Badge>Replay</Badge>}
            {s.allowPause && <Badge>Pause allowed</Badge>}
          </div>
        </Card>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        {isHost ? (
          <Button size="lg" onClick={onStart} disabled={!ready || busy} className={cn("min-w-56")} data-testid="start-game"><Play />Start game</Button>
        ) : (
          <p className="text-sm text-muted">Waiting for the host to start…</p>
        )}
        {!ready && <p className="text-xs text-muted">Each side needs {room.seatsPerSide} player{room.seatsPerSide > 1 ? "s" : ""}. Share the code above.</p>}
      </div>
    </div>
  );
}
