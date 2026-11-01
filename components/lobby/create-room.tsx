"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented, Toggle } from "@/components/ui/segmented";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_ROOM_SETTINGS, LABELS, minutesFor, type RoomSettings } from "@/lib/room-settings";
import { CUSTOM_TIME_LIMITS } from "@/lib/game-rules/config";
import { request } from "@/lib/client/socket";

function Section({ n, title, children, hint }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-bold text-primary tabular">{String(n).padStart(2, "0")}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function CreateRoom() {
  const [s, setS] = useState<RoomSettings>(DEFAULT_ROOM_SETTINGS);
  const [summary, setSummary] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const set = <K extends keyof RoomSettings>(k: K, v: RoomSettings[K]) => setS((x) => ({ ...x, [k]: v }));

  const create = async () => {
    setBusy(true);
    const r = await request<{ code: string }>("room:create", s);
    setBusy(false);
    if (!r.ok) return toast(r.error, "error");
    router.push(`/room/${r.data!.code}`);
  };

  const rows: [string, string][] = [
    ["Game type", s.gameType === "1v1" ? "1 vs 1" : "2 vs 2 (shared team rack)"],
    ["Time control", `${minutesFor(s)} min per side${s.timeMode === "CUSTOM" ? " (custom)" : ` · ${LABELS.timeMode[s.timeMode].split(" ·")[0]}`}`],
    ["When time runs out", s.timeoutBehavior === "OVERTIME_PENALTY" ? "Overtime: −10 points per started minute" : "Game ends immediately"],
    ["Score management", LABELS.scoreManagement[s.scoreManagement]],
    ["Validation", LABELS.validation[s.validation]],
    ["Voice chat", s.voiceEnabled ? "Enabled" : "Disabled"],
    ["Privacy", s.privacy === "PRIVATE" ? "Private (code only)" : "Public (listed in lobby)"],
    ["Spectators", s.allowSpectators ? "Allowed" : "Not allowed"],
    ["Match replay", s.replayEnabled ? "Enabled" : "Disabled"],
    ["Pause", s.allowPause ? "Allowed with opponent consent" : "Not allowed"],
  ];

  return (
    <Card className="p-6">
      <div className="space-y-7">
        <Section n={1} title="Game type">
          <Segmented name="Game type" cols={2} value={s.gameType} onChange={(v) => set("gameType", v)} options={[
            { value: "1v1", label: "1 vs 1", hint: "Classic duel" },
            { value: "2v2", label: "2 vs 2", hint: "Teams share one rack & score" },
          ]} />
        </Section>
        <Section n={2} title="Time control" hint="per player">
          <Segmented name="Time control" value={s.timeMode} onChange={(v) => set("timeMode", v)} options={[
            { value: "BLITZ", label: "5 MIN", hint: "Blitz" },
            { value: "RAPID", label: "12 MIN", hint: "Rapid" },
            { value: "STANDARD", label: "22 MIN", hint: "Standard" },
            { value: "CUSTOM", label: "CUSTOM", hint: "Your choice" },
          ]} />
          {s.timeMode === "CUSTOM" && (
            <div className="flex items-center gap-3">
              <Input type="number" min={CUSTOM_TIME_LIMITS.min} max={CUSTOM_TIME_LIMITS.max} value={s.customMinutes} className="w-28"
                onChange={(e) => set("customMinutes", Math.max(CUSTOM_TIME_LIMITS.min, Math.min(CUSTOM_TIME_LIMITS.max, Number(e.target.value) || CUSTOM_TIME_LIMITS.min)))} aria-label="Custom minutes" />
              <span className="text-sm text-muted">minutes per side ({CUSTOM_TIME_LIMITS.min}–{CUSTOM_TIME_LIMITS.max})</span>
            </div>
          )}
          <Segmented name="Timeout" cols={2} value={s.timeoutBehavior} onChange={(v) => set("timeoutBehavior", v)} options={[
            { value: "OVERTIME_PENALTY", label: "Overtime penalty", hint: "−10 pts per started minute" },
            { value: "END_GAME", label: "End on timeout", hint: "Game stops at 00:00" },
          ]} />
        </Section>
        <Section n={3} title="Score management">
          <Segmented name="Score management" cols={2} value={s.scoreManagement} onChange={(v) => set("scoreManagement", v)} options={[
            { value: "AUTO_SCORE_AUTO_TILES", label: "Auto score + Auto tiles", hint: "Recommended" },
            { value: "AUTO_SCORE_ONLY", label: "Auto score only", hint: "You draw tiles yourself" },
            { value: "AUTO_TILES_ONLY", label: "Auto tiles only", hint: "You enter your score" },
            { value: "MANUAL", label: "Manual score + tiles", hint: "Board & timer only" },
          ]} />
        </Section>
        <Section n={4} title="Challenge settings">
          <Segmented name="Validation" cols={2} value={s.validation} onChange={(v) => set("validation", v)} options={[
            { value: "CHALLENGE", label: "Challenge ON", hint: "Opponent can challenge moves" },
            { value: "STRICT", label: "Strict mode", hint: "Only correct equations allowed" },
          ]} />
        </Section>
        <Section n={5} title="Voice chat">
          <Segmented name="Voice" cols={2} value={s.voiceEnabled ? "on" : "off"} onChange={(v) => set("voiceEnabled", v === "on")} options={[
            { value: "on", label: "Enabled", hint: "WebRTC voice in the room" },
            { value: "off", label: "Disabled" },
          ]} />
        </Section>
        <Section n={6} title="Room privacy">
          <Segmented name="Privacy" cols={2} value={s.privacy} onChange={(v) => set("privacy", v)} options={[
            { value: "PRIVATE", label: "Private room", hint: "Join with code only" },
            { value: "PUBLIC", label: "Public room", hint: "Listed in the lobby" },
          ]} />
        </Section>
        <Section n={7} title="Optional settings">
          <div className="grid gap-2 sm:grid-cols-3">
            <Toggle checked={s.allowSpectators} onChange={(v) => set("allowSpectators", v)} label="Allow spectators" hint="And a referee" />
            <Toggle checked={s.replayEnabled} onChange={(v) => set("replayEnabled", v)} label="Enable match replay" />
            <Toggle checked={s.allowPause} onChange={(v) => set("allowPause", v)} label="Allow pause" hint="Both must agree" />
          </div>
        </Section>
      </div>
      <Button size="lg" className="mt-8 w-full" onClick={() => setSummary(true)} data-testid="review-room">Review &amp; create room</Button>
      <Dialog open={summary} onOpenChange={setSummary}>
        <DialogContent>
          <DialogTitle>Room summary</DialogTitle>
          <DialogDescription>Settings are locked once the game starts.</DialogDescription>
          <dl className="mt-4 divide-y divide-line rounded-xl border border-line text-sm">
            {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 px-3 py-2"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
          </dl>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">Edit</Button></DialogClose>
            <Button onClick={create} disabled={busy} data-testid="create-room">Create room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
