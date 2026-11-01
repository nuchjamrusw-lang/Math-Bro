/**
 * WebRTC signaling on a dedicated `/voice` namespace — fully independent from the game channel.
 * The server only relays SDP/ICE and mic status; audio flows peer-to-peer. Nothing here can
 * touch game state, so a voice failure can never stop or corrupt a match.
 */
import type { Server } from "socket.io";
import type { SessionUser } from "@/lib/auth/session";
import type { RoomManager } from "../game-session/room-manager";
import { authenticate } from "../socket";

export interface VoicePeer { socketId: string; userId: string; username: string; muted: boolean; speaking: boolean }

export function setupVoiceSignaling(io: Server, manager: RoomManager) {
  const nsp = io.of("/voice");
  const peers = new Map<string, VoicePeer & { code: string }>();

  const listFor = (code: string) => [...peers.values()].filter((p) => p.code === code).map(({ code: _c, ...p }) => { void _c; return p; });

  nsp.use(async (socket, next) => {
    const user = await authenticate(socket);
    if (!user) return next(new Error("UNAUTHENTICATED"));
    socket.data.user = user;
    next();
  });

  nsp.on("connection", (socket) => {
    const user = socket.data.user as SessionUser;

    socket.on("voice:join", (p: { code: string; muted?: boolean }, cb?: (r: { ok: boolean; error?: string; peers?: VoicePeer[] }) => void) => {
      try {
        const room = manager.get(p.code);
        if (!room.members.has(user.uid)) return cb?.({ ok: false, error: "Join the room first" });
        if (room.voiceDisabled || !room.settings.voiceEnabled) return cb?.({ ok: false, error: "Voice chat is disabled in this room" });
        const existing = listFor(room.code);
        peers.set(socket.id, { socketId: socket.id, userId: user.uid, username: user.username, muted: !!p.muted, speaking: false, code: room.code });
        socket.join(`voice:${room.code}`);
        socket.to(`voice:${room.code}`).emit("voice:peer-joined", { socketId: socket.id, userId: user.uid, username: user.username, muted: !!p.muted, speaking: false });
        cb?.({ ok: true, peers: existing });
      } catch (e) {
        cb?.({ ok: false, error: (e as Error).message });
      }
    });

    socket.on("voice:signal", (p: { to: string; data: unknown }) => {
      const me = peers.get(socket.id);
      const target = peers.get(p?.to);
      if (!me || !target || me.code !== target.code) return;
      nsp.to(p.to).emit("voice:signal", { from: socket.id, data: p.data });
    });

    socket.on("voice:status", (p: { muted?: boolean; speaking?: boolean }) => {
      const me = peers.get(socket.id);
      if (!me) return;
      if (typeof p.muted === "boolean") me.muted = p.muted;
      if (typeof p.speaking === "boolean") me.speaking = p.speaking;
      nsp.to(`voice:${me.code}`).emit("voice:status", { socketId: socket.id, muted: me.muted, speaking: me.speaking });
    });

    const leave = () => {
      const me = peers.get(socket.id);
      if (!me) return;
      peers.delete(socket.id);
      nsp.to(`voice:${me.code}`).emit("voice:peer-left", { socketId: socket.id });
      socket.leave(`voice:${me.code}`);
    };
    socket.on("voice:leave", leave);
    socket.on("disconnect", leave);
  });

  // When the host disables voice for the room, kick everyone out of the voice channel.
  setInterval(() => {
    for (const p of peers.values()) {
      const room = manager.rooms.get(p.code);
      if (!room || room.voiceDisabled || !room.settings.voiceEnabled) {
        nsp.to(p.socketId).emit("voice:disabled");
        peers.delete(p.socketId);
        nsp.to(`voice:${p.code}`).emit("voice:peer-left", { socketId: p.socketId });
      }
    }
  }, 2000).unref();
}
