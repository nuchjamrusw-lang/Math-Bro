/** Socket.IO wiring for the game channel (default namespace). */
import type { Server, Socket } from "socket.io";
import { SESSION_COOKIE, parseCookie, verifySession, type SessionUser } from "@/lib/auth/session";
import type { Ack, ActionEnvelope } from "@/lib/protocol";
import { RoomManager, errorMessage, type Room } from "../game-session/room-manager";

type Cb = (ack: Ack) => void;

export async function authenticate(socket: Socket): Promise<SessionUser | null> {
  const token = parseCookie(socket.handshake.headers.cookie, SESSION_COOKIE) ?? (socket.handshake.auth?.token as string | undefined);
  return verifySession(token);
}

export function setupGameSockets(io: Server, opts: { persist?: boolean } = {}): RoomManager {
  const sideOfSocket = (room: Room, s: Socket) => room.sideOf((s.data.user as SessionUser).uid);

  const manager = new RoomManager(
    {
    roomState(room) {
      io.to(`room:${room.code}`).emit("room:state", room.snapshot());
    },
    async gameState(room) {
      if (!room.engine) return;
      const now = Date.now();
      const sockets = await io.in(`room:${room.code}`).fetchSockets();
      for (const s of sockets) {
        const side = room.sideOf((s.data.user as SessionUser).uid);
        s.emit("game:state", { view: room.engine.view(side, now) });
      }
    },
    notice(room, notice) {
      io.to(`room:${room.code}`).emit("game:notice", notice);
    },
    matched(userIds, code) {
      for (const uid of userIds) io.to(`user:${uid}`).emit("quick:matched", { code });
    },
  },
    Date.now,
    opts.persist ?? true,
  );

  io.use(async (socket, next) => {
    const user = await authenticate(socket);
    if (!user) return next(new Error("UNAUTHENTICATED"));
    socket.data.user = user;
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SessionUser;
    socket.join(`user:${user.uid}`);
    const joined = new Set<string>();

    const safe = (fn: () => unknown) => (cb?: Cb) => {
      try {
        const data = fn();
        cb?.({ ok: true, data });
      } catch (e) {
        cb?.({ ok: false, ...errorMessage(e) });
      }
    };

    const enter = (room: Room) => {
      if (!joined.has(room.code)) {
        joined.add(room.code);
        socket.join(`room:${room.code}`);
        manager.connect(user, room.code);
      }
      socket.emit("room:state", room.snapshot());
      if (room.engine) socket.emit("game:state", { view: room.engine.view(sideOfSocket(room, socket), Date.now()) });
    };

    socket.on("room:create", (settings: unknown, cb?: Cb) =>
      safe(() => {
        const room = manager.createRoom(user, settings);
        enter(room);
        return { code: room.code };
      })(cb),
    );

    socket.on("room:join", (p: { code: string; spectate?: boolean }, cb?: Cb) =>
      safe(() => {
        const room = manager.joinRoom(user, p?.code, { spectate: p?.spectate });
        enter(room);
        return { code: room.code };
      })(cb),
    );

    socket.on("room:leave", (p: { code: string }, cb?: Cb) =>
      safe(() => {
        const code = String(p?.code).toUpperCase();
        if (joined.delete(code)) {
          manager.disconnect(user, code);
          socket.leave(`room:${code}`);
        }
        manager.leaveRoom(user, code);
      })(cb),
    );

    socket.on("room:seat", (p: { code: string; side: number | null; role: "PLAYER" | "SPECTATOR" | "REFEREE" }, cb?: Cb) =>
      safe(() => manager.setSeat(user, p.code, { side: p.side, role: p.role }))(cb),
    );
    socket.on("room:start", (p: { code: string }, cb?: Cb) => safe(() => void manager.startGame(user, p.code))(cb));
    socket.on("room:rematch", (p: { code: string }, cb?: Cb) => safe(() => void manager.rematch(user, p.code))(cb));
    socket.on("room:voice", (p: { code: string; disabled: boolean }, cb?: Cb) =>
      safe(() => manager.setVoiceDisabled(user, p.code, !!p.disabled))(cb),
    );
    socket.on("game:action", (p: { code: string } & ActionEnvelope, cb?: Cb) =>
      safe(() => manager.action(user, p.code, { action: p.action, version: p.version }))(cb),
    );
    socket.on("game:sync", (p: { code: string }, cb?: Cb) =>
      safe(() => {
        const room = manager.get(p.code);
        return room.engine ? { view: room.engine.view(sideOfSocket(room, socket), Date.now()) } : null;
      })(cb),
    );
    socket.on("rooms:list", (_: unknown, cb?: Cb) => safe(() => manager.publicRooms())(cb));
    socket.on("quick:join", (p: { gameType: "1v1" | "2v2" }, cb?: Cb) =>
      safe(() => manager.quickJoin(user, p?.gameType === "2v2" ? "2v2" : "1v1"))(cb),
    );
    socket.on("quick:leave", (_: unknown, cb?: Cb) => safe(() => manager.quickLeave(user))(cb));
    socket.on("time:sync", (_: unknown, cb?: Cb) => cb?.({ ok: true, data: { now: Date.now() } }));

    socket.on("disconnect", () => {
      manager.quickLeave(user);
      for (const code of joined) manager.disconnect(user, code);
    });
  });

  setInterval(() => manager.tick(), 500).unref();
  return manager;
}
