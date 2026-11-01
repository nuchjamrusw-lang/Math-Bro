"use client";
/**
 * WebRTC mesh voice chat (≤4 peers) with signaling over the dedicated `/voice` Socket.IO namespace.
 * Entirely independent from the game socket: any failure here only affects audio.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export interface VoicePeerState { socketId: string; userId: string; username: string; muted: boolean; speaking: boolean; connection: RTCPeerConnectionState | "new" }
export type VoiceStatus = "off" | "requesting" | "connecting" | "connected" | "error" | "disabled";
/** Error as an i18n key (under "voice.") plus params, translated by the UI. */
export interface VoiceError { key: "errDenied" | "errUnsupported" | "errUnavailable" | "errServer" | "errJoin"; msg?: string }

function iceServers(): RTCIceServer[] {
  try {
    const raw = process.env.NEXT_PUBLIC_ICE_SERVERS;
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [{ urls: "stun:stun.l.google.com:19302" }];
}

export function useVoiceChat(code: string, enabled: boolean) {
  const [status, setStatus] = useState<VoiceStatus>(enabled ? "off" : "disabled");
  const [error, setError] = useState<VoiceError | null>(null);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [peers, setPeers] = useState<Record<string, VoicePeerState>>({});
  const sock = useRef<Socket | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const pcs = useRef(new Map<string, RTCPeerConnection>());
  const audios = useRef(new Map<string, HTMLAudioElement>());
  const raf = useRef<number | null>(null);
  const ctx = useRef<AudioContext | null>(null);

  const patchPeer = (id: string, p: Partial<VoicePeerState>) =>
    setPeers((s) => (s[id] || p.userId ? { ...s, [id]: { ...(s[id] ?? { socketId: id, userId: "", username: "", muted: false, speaking: false, connection: "new" }), ...p } } : s));

  const closePeer = (id: string) => {
    pcs.current.get(id)?.close();
    pcs.current.delete(id);
    const a = audios.current.get(id);
    if (a) { a.srcObject = null; a.remove(); }
    audios.current.delete(id);
    setPeers((s) => { const n = { ...s }; delete n[id]; return n; });
  };

  const makePc = (id: string) => {
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    stream.current?.getTracks().forEach((t) => pc.addTrack(t, stream.current!));
    pc.onicecandidate = (e) => e.candidate && sock.current?.emit("voice:signal", { to: id, data: { candidate: e.candidate } });
    pc.ontrack = (e) => {
      let a = audios.current.get(id);
      if (!a) { a = new Audio(); a.autoplay = true; audios.current.set(id, a); }
      a.srcObject = e.streams[0];
      void a.play().catch(() => {});
    };
    pc.onconnectionstatechange = () => patchPeer(id, { connection: pc.connectionState });
    pcs.current.set(id, pc);
    return pc;
  };

  const stop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    void ctx.current?.close().catch(() => {});
    ctx.current = null;
    sock.current?.emit("voice:leave");
    sock.current?.disconnect();
    sock.current = null;
    [...pcs.current.keys()].forEach(closePeer);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setPeers({});
    setSpeaking(false);
    setStatus((s) => (s === "disabled" ? s : "off"));
  }, []);

  const start = useCallback(async () => {
    if (!enabled) return;
    setError(null);
    setStatus("requesting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setError({ key: "errUnsupported" });
        return;
      }
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      setStatus("error");
      setError((e as Error).name === "NotAllowedError" ? { key: "errDenied" } : { key: "errUnavailable", msg: (e as Error).message });
      return;
    }
    setStatus("connecting");
    // Speaking detection
    try {
      const ac = new AudioContext();
      ctx.current = ac;
      const an = ac.createAnalyser();
      an.fftSize = 512;
      ac.createMediaStreamSource(stream.current).connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      let last = false, lastSent = 0;
      const loop = () => {
        an.getByteFrequencyData(buf);
        const level = buf.reduce((a, b) => a + b, 0) / buf.length;
        const on = level > 18 && !!stream.current?.getAudioTracks()[0]?.enabled;
        if (on !== last && Date.now() - lastSent > 200) {
          last = on; lastSent = Date.now(); setSpeaking(on);
          sock.current?.emit("voice:status", { speaking: on });
        }
        raf.current = requestAnimationFrame(loop);
      };
      loop();
    } catch { /* speaking indicator is optional */ }

    const s = io("/voice", { path: "/socket.io", withCredentials: true, transports: ["websocket", "polling"] });
    sock.current = s;
    s.on("connect_error", () => { setStatus("error"); setError({ key: "errServer" }); });
    s.on("connect", () => {
      s.emit("voice:join", { code, muted }, async (r: { ok: boolean; error?: string; peers?: Omit<VoicePeerState, "connection">[] }) => {
        if (!r.ok) { setStatus("error"); setError({ key: "errJoin" }); return; }
        setStatus("connected");
        // We are the newcomer: call everyone already in the channel.
        for (const p of r.peers ?? []) {
          patchPeer(p.socketId, { ...p, connection: "new" });
          const pc = makePc(p.socketId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          s.emit("voice:signal", { to: p.socketId, data: { sdp: pc.localDescription } });
        }
      });
    });
    s.on("voice:peer-joined", (p: Omit<VoicePeerState, "connection">) => patchPeer(p.socketId, { ...p, connection: "new" }));
    s.on("voice:peer-left", (p: { socketId: string }) => closePeer(p.socketId));
    s.on("voice:status", (p: { socketId: string; muted: boolean; speaking: boolean }) => patchPeer(p.socketId, { muted: p.muted, speaking: p.speaking }));
    s.on("voice:disabled", () => { stop(); setStatus("disabled"); });
    s.on("voice:signal", async ({ from, data }: { from: string; data: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } }) => {
      try {
        let pc = pcs.current.get(from);
        if (data.sdp) {
          if (!pc) pc = makePc(from);
          await pc.setRemoteDescription(data.sdp);
          if (data.sdp.type === "offer") {
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            s.emit("voice:signal", { to: from, data: { sdp: pc.localDescription } });
          }
        } else if (data.candidate && pc) {
          await pc.addIceCandidate(data.candidate);
        }
      } catch (e) {
        console.warn("[voice] signal error", e);
      }
    });
  }, [code, enabled, muted, stop]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    stream.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    sock.current?.emit("voice:status", { muted: next, speaking: false });
  }, [muted]);

  useEffect(() => {
    if (!enabled) { stop(); setStatus("disabled"); } else setStatus((s) => (s === "disabled" ? "off" : s));
  }, [enabled, stop]);
  useEffect(() => () => stop(), [stop]);

  return { status, error, muted, speaking, peers: Object.values(peers), start, stop, toggleMute };
}
