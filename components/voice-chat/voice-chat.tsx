"use client";
import { Mic, MicOff, PhoneOff, Headphones, Loader2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceChat } from "./use-voice-chat";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

/** Compact voice controls for the bottom of the game screen. */
export function VoiceChat({ code, enabled, isHost, onToggleRoomVoice }: { code: string; enabled: boolean; isHost: boolean; onToggleRoomVoice?: (disabled: boolean) => void }) {
  const v = useVoiceChat(code, enabled);
  const { t, td } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" data-testid="voice-chat">
      {v.status === "disabled" ? (
        <span className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs text-muted"><VolumeX className="size-3.5" />{t("voice.off")}</span>
      ) : v.status === "off" || v.status === "error" ? (
        <Button variant="secondary" size="sm" onClick={v.start} data-testid="join-voice"><Headphones />{t("voice.join")}</Button>
      ) : (
        <>
          <Button variant={v.muted ? "danger" : "soft"} size="sm" onClick={v.toggleMute} aria-label={v.muted ? t("voice.unmute") : t("voice.mute")} data-testid="mute-btn" className={cn(v.speaking && !v.muted && "ring-2 ring-success")}>
            {v.status !== "connected" ? <Loader2 className="animate-spin" /> : v.muted ? <MicOff /> : <Mic />}
            {v.muted ? t("voice.muted") : v.speaking ? t("voice.speaking") : t("voice.micOn")}
          </Button>
          <Button variant="ghost" size="sm" onClick={v.stop} aria-label={t("voice.leave")}><PhoneOff /></Button>
          {v.peers.map((p) => (
            <span key={p.socketId} className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition", p.speaking && !p.muted ? "border-success bg-success-soft text-success" : "border-line text-muted")}
              title={p.connection}>
              {p.muted ? <MicOff className="size-3" /> : <Mic className="size-3" />}{p.username}
              {p.connection !== "connected" && p.connection !== "new" && <span className="text-[10px]">· {p.connection}</span>}
            </span>
          ))}
        </>
      )}
      {isHost && onToggleRoomVoice && (
        <Button variant="ghost" size="sm" onClick={() => onToggleRoomVoice(enabled)}>{enabled ? t("voice.disableRoom") : t("voice.enableRoom")}</Button>
      )}
      {v.error && <p className="w-full text-center text-xs text-error">{td(`voice.${v.error.key}`, { msg: v.error.msg })}</p>}
    </div>
  );
}
