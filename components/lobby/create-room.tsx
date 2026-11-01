"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented, Toggle } from "@/components/ui/segmented";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_ROOM_SETTINGS, minutesFor, type RoomSettings } from "@/lib/room-settings";
import { CUSTOM_TIME_LIMITS } from "@/lib/game-rules/config";
import { request } from "@/lib/client/socket";
import { useI18n } from "@/lib/i18n/client";
import { ackError } from "@/lib/i18n/format";

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
  const { t, td } = useI18n();
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
    if (!r.ok) return toast(ackError(td, r), "error");
    router.push(`/room/${r.data!.code}`);
  };

  const rows: [string, string][] = [
    [t("sum.gameType"), s.gameType === "1v1" ? t("sum.1v1") : t("sum.2v2")],
    [t("sum.time"), `${t("sum.minPerSide", { n: minutesFor(s) })} · ${td(`time.${s.timeMode}`)}`],
    [t("sum.timeout"), s.timeoutBehavior === "OVERTIME_PENALTY" ? t("sum.overtimeVal") : t("sum.endVal")],
    [t("sum.score"), td(`sm.${s.scoreManagement}`)],
    [t("sum.validation"), td(`val.${s.validation}`)],
    [t("sum.voice"), s.voiceEnabled ? t("create.enabled") : t("create.disabled")],
    [t("sum.privacy"), s.privacy === "PRIVATE" ? t("sum.privateVal") : t("sum.publicVal")],
    [t("sum.spectators"), s.allowSpectators ? t("sum.allowed") : t("sum.notAllowed")],
    [t("sum.replay"), s.replayEnabled ? t("create.enabled") : t("create.disabled")],
    [t("sum.pause"), s.allowPause ? t("sum.pauseVal") : t("sum.notAllowed")],
  ];

  const sm = ["AUTO_SCORE_AUTO_TILES", "AUTO_SCORE_ONLY", "AUTO_TILES_ONLY", "MANUAL"] as const;

  return (
    <Card className="p-6">
      <div className="space-y-7">
        <Section n={1} title={t("create.gameType")}>
          <Segmented name={t("create.gameType")} cols={2} value={s.gameType} onChange={(v) => set("gameType", v)} options={[
            { value: "1v1", label: t("create.1v1"), hint: t("create.1v1Hint") },
            { value: "2v2", label: t("create.2v2"), hint: t("create.2v2Hint") },
          ]} />
        </Section>
        <Section n={2} title={t("create.time")} hint={t("create.perPlayer")}>
          <Segmented name={t("create.time")} value={s.timeMode} onChange={(v) => set("timeMode", v)} options={[
            { value: "BLITZ", label: t("create.min", { n: 5 }), hint: t("time.BLITZ") },
            { value: "RAPID", label: t("create.min", { n: 12 }), hint: t("time.RAPID") },
            { value: "STANDARD", label: t("create.min", { n: 22 }), hint: t("time.STANDARD") },
            { value: "CUSTOM", label: t("create.custom"), hint: t("create.customHint") },
          ]} />
          {s.timeMode === "CUSTOM" && (
            <div className="flex items-center gap-3">
              <Input type="number" min={CUSTOM_TIME_LIMITS.min} max={CUSTOM_TIME_LIMITS.max} value={s.customMinutes} className="w-28"
                onChange={(e) => set("customMinutes", Math.max(CUSTOM_TIME_LIMITS.min, Math.min(CUSTOM_TIME_LIMITS.max, Number(e.target.value) || CUSTOM_TIME_LIMITS.min)))} aria-label={t("create.customAria")} />
              <span className="text-sm text-muted">{t("create.customMinutes", { min: CUSTOM_TIME_LIMITS.min, max: CUSTOM_TIME_LIMITS.max })}</span>
            </div>
          )}
          <Segmented name={t("sum.timeout")} cols={2} value={s.timeoutBehavior} onChange={(v) => set("timeoutBehavior", v)} options={[
            { value: "OVERTIME_PENALTY", label: t("create.overtime"), hint: t("create.overtimeHint") },
            { value: "END_GAME", label: t("create.endOnTimeout"), hint: t("create.endOnTimeoutHint") },
          ]} />
        </Section>
        <Section n={3} title={t("create.score")}>
          <Segmented name={t("create.score")} cols={2} value={s.scoreManagement} onChange={(v) => set("scoreManagement", v)}
            options={sm.map((v) => ({ value: v, label: td(`sm.${v}`), hint: td(`smHint.${v}`) }))} />
        </Section>
        <Section n={4} title={t("create.challenge")}>
          <Segmented name={t("create.challenge")} cols={2} value={s.validation} onChange={(v) => set("validation", v)} options={[
            { value: "CHALLENGE", label: t("val.CHALLENGE"), hint: t("valHint.CHALLENGE") },
            { value: "STRICT", label: t("val.STRICT"), hint: t("valHint.STRICT") },
          ]} />
        </Section>
        <Section n={5} title={t("create.voice")}>
          <Segmented name={t("create.voice")} cols={2} value={s.voiceEnabled ? "on" : "off"} onChange={(v) => set("voiceEnabled", v === "on")} options={[
            { value: "on", label: t("create.enabled"), hint: t("create.voiceHint") },
            { value: "off", label: t("create.disabled") },
          ]} />
        </Section>
        <Section n={6} title={t("create.privacy")}>
          <Segmented name={t("create.privacy")} cols={2} value={s.privacy} onChange={(v) => set("privacy", v)} options={[
            { value: "PRIVATE", label: t("create.private"), hint: t("create.privateHint") },
            { value: "PUBLIC", label: t("create.public"), hint: t("create.publicHint") },
          ]} />
        </Section>
        <Section n={7} title={t("create.optional")}>
          <div className="grid gap-2 sm:grid-cols-3">
            <Toggle checked={s.allowSpectators} onChange={(v) => set("allowSpectators", v)} label={t("create.allowSpectators")} hint={t("create.spectatorsHint")} />
            <Toggle checked={s.replayEnabled} onChange={(v) => set("replayEnabled", v)} label={t("create.replay")} />
            <Toggle checked={s.allowPause} onChange={(v) => set("allowPause", v)} label={t("create.allowPause")} hint={t("create.pauseHint")} />
          </div>
        </Section>
      </div>
      <Button size="lg" className="mt-8 w-full" onClick={() => setSummary(true)} data-testid="review-room">{t("create.review")}</Button>
      <Dialog open={summary} onOpenChange={setSummary}>
        <DialogContent>
          <DialogTitle>{t("create.summary")}</DialogTitle>
          <DialogDescription>{t("create.locked")}</DialogDescription>
          <dl className="mt-4 divide-y divide-line rounded-xl border border-line text-sm">
            {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 px-3 py-2"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
          </dl>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">{t("create.edit")}</Button></DialogClose>
            <Button onClick={create} disabled={busy} data-testid="create-room">{t("create.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
