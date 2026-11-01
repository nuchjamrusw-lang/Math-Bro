/**
 * Authoritative room & game session manager. Owns every live GameEngine; clients only send intents.
 * Transport-agnostic: socket wiring lives in server/socket.
 */
import { randomInt } from "node:crypto";
import { GameEngine, GameError, type GameState, type MoveRecord } from "@/lib/game-engine";
import type { SessionUser } from "@/lib/auth/session";
import type { ActionEnvelope, GameNotice, MemberRole, PublicRoomInfo, RoomMemberInfo, RoomSnapshot } from "@/lib/protocol";
import { gameActionSchema } from "@/lib/protocol";
import { roomSettingsSchema, rulesFromSettings, DEFAULT_ROOM_SETTINGS, type RoomSettings } from "@/lib/room-settings";
import * as db from "./persistence";

export class RoomError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

interface Member extends RoomMemberInfo { sockets: number; disconnectedAt: number | null }

export class Room {
  members = new Map<string, Member>();
  status: RoomSnapshot["status"] = "LOBBY";
  engine: GameEngine | null = null;
  matchId: string | null = null;
  voiceDisabled = false;
  lastActivity = Date.now();
  refereeAbsentSince: number | null = null;
  constructor(public code: string, public hostId: string, public settings: RoomSettings, public createdAt = Date.now()) {}

  get seatsPerSide() { return this.settings.gameType === "2v2" ? 2 : 1; }
  sideMembers(side: number) { return [...this.members.values()].filter((m) => m.role === "PLAYER" && m.side === side); }
  referee() { return [...this.members.values()].find((m) => m.role === "REFEREE") ?? null; }

  snapshot(): RoomSnapshot {
    return {
      code: this.code, hostId: this.hostId, settings: this.settings, status: this.status,
      members: [...this.members.values()].map(({ sockets, disconnectedAt, ...m }) => { void sockets; void disconnectedAt; return m; }),
      matchId: this.matchId, voiceDisabled: this.voiceDisabled || !this.settings.voiceEnabled,
      createdAt: this.createdAt, seatsPerSide: this.seatsPerSide,
    };
  }

  /** Which engine side (if any) a user controls. */
  sideOf(userId: string): number | null {
    const m = this.members.get(userId);
    return m && m.role === "PLAYER" ? m.side : null;
  }
}

export interface RoomEmitter {
  roomState(room: Room): void;
  gameState(room: Room): void;
  notice(room: Room, notice: GameNotice): void;
  matched?(userIds: string[], code: string): void;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class RoomManager {
  rooms = new Map<string, Room>();
  private queues: Record<"1v1" | "2v2", SessionUser[]> = { "1v1": [], "2v2": [] };

  constructor(private emit: RoomEmitter, private now: () => number = Date.now, private persist = true) {}

  private newCode() {
    for (;;) {
      const code = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
      if (!this.rooms.has(code)) return code;
    }
  }

  get(code: string): Room {
    const r = this.rooms.get(String(code).toUpperCase().trim());
    if (!r) throw new RoomError("ROOM_NOT_FOUND", "Room not found — check the code");
    return r;
  }

  createRoom(user: SessionUser, settingsInput: unknown): Room {
    const parsed = roomSettingsSchema.safeParse(settingsInput ?? {});
    if (!parsed.success) throw new RoomError("BAD_SETTINGS", "Invalid room settings");
    const room = new Room(this.newCode(), user.uid, parsed.data);
    this.rooms.set(room.code, room);
    this.addMember(room, user, "PLAYER", 0);
    return room;
  }

  private addMember(room: Room, user: SessionUser, role: MemberRole, side: number | null) {
    room.members.set(user.uid, {
      userId: user.uid, username: user.username, avatarColor: user.avatarColor, guest: user.guest,
      role, side, connected: true, isHost: room.hostId === user.uid, sockets: 0, disconnectedAt: null,
    });
  }

  joinRoom(user: SessionUser, code: string, opts: { spectate?: boolean } = {}): Room {
    const room = this.get(code);
    room.lastActivity = this.now();
    const existing = room.members.get(user.uid);
    if (existing) return room; // re-join / reconnect keeps the seat
    const freeSide = [0, 1].find((s) => room.sideMembers(s).length < room.seatsPerSide);
    if (!opts.spectate && room.status === "LOBBY" && freeSide !== undefined) {
      this.addMember(room, user, "PLAYER", freeSide);
    } else if (room.settings.allowSpectators) {
      this.addMember(room, user, "SPECTATOR", null);
    } else {
      throw new RoomError("ROOM_FULL", "This room is full and does not allow spectators");
    }
    this.emit.roomState(room);
    return room;
  }

  leaveRoom(user: SessionUser, code: string) {
    const room = this.get(code);
    const m = room.members.get(user.uid);
    if (!m) return;
    if (room.status === "PLAYING" && m.role === "PLAYER") {
      // Players keep their seat during a game; they can come back.
      m.connected = false;
    } else {
      room.members.delete(user.uid);
      if (room.hostId === user.uid) {
        const next = [...room.members.values()][0];
        if (next) { room.hostId = next.userId; next.isHost = true; }
      }
    }
    if (room.members.size === 0 && room.status !== "PLAYING") this.rooms.delete(room.code);
    else this.emit.roomState(room);
  }

  setSeat(user: SessionUser, code: string, target: { side: number | null; role: MemberRole }) {
    const room = this.get(code);
    if (room.status === "PLAYING") throw new RoomError("IN_GAME", "Seats are locked during a game");
    const m = room.members.get(user.uid);
    if (!m) throw new RoomError("NOT_MEMBER", "Join the room first");
    if (target.role === "PLAYER") {
      if (target.side !== 0 && target.side !== 1) throw new RoomError("BAD_SEAT", "Pick side A or B");
      const taken = room.sideMembers(target.side).filter((x) => x.userId !== user.uid).length;
      if (taken >= room.seatsPerSide) throw new RoomError("SEAT_TAKEN", "That side is full");
      m.role = "PLAYER"; m.side = target.side;
    } else if (target.role === "REFEREE") {
      const current = room.referee();
      if (current && current.userId !== user.uid) throw new RoomError("SEAT_TAKEN", "This room already has a referee");
      m.role = "REFEREE"; m.side = null;
    } else {
      if (!room.settings.allowSpectators) throw new RoomError("NOT_ALLOWED", "Spectators are disabled for this room");
      m.role = "SPECTATOR"; m.side = null;
    }
    this.emit.roomState(room);
  }

  setVoiceDisabled(user: SessionUser, code: string, disabled: boolean) {
    const room = this.get(code);
    if (room.hostId !== user.uid) throw new RoomError("NOT_HOST", "Only the host can change voice chat for the room");
    room.voiceDisabled = disabled;
    this.emit.roomState(room);
  }

  startGame(user: SessionUser, code: string): Room {
    const room = this.get(code);
    if (room.hostId !== user.uid) throw new RoomError("NOT_HOST", "Only the host can start the game");
    if (room.status === "PLAYING") throw new RoomError("IN_GAME", "The game has already started");
    const sides = [0, 1].map((s) => room.sideMembers(s));
    if (sides.some((s) => s.length !== room.seatsPerSide)) {
      throw new RoomError("SEATS_EMPTY", `Each side needs ${room.seatsPerSide} player${room.seatsPerSide > 1 ? "s" : ""}`);
    }
    const now = this.now();
    const engine = GameEngine.create({
      id: room.code,
      rules: rulesFromSettings(room.settings),
      hasReferee: !!room.referee(),
      sides: sides.map((ms, i) => ({
        name: ms.length === 1 ? ms[0].username : `Team ${i === 0 ? "A" : "B"}`,
        members: ms.map((m) => ({ id: m.userId, name: m.username })),
      })),
    });
    engine.start(now);
    room.engine = engine;
    room.status = "PLAYING";
    room.matchId = null;
    room.lastActivity = now;
    this.emit.roomState(room);
    this.emit.gameState(room);
    const starter = engine.state.sides[engine.state.turn].name;
    this.emit.notice(room, { kind: "INFO", message: `Draw for first move: ${starter} starts`, sideIndex: engine.state.turn });
    if (this.persist) {
      db.createMatch({
        roomCode: room.code, settings: room.settings, state: engine.state,
        players: sides.flatMap((ms, side) => ms.map((m) => ({ userId: m.userId, username: m.username, side }))),
      }).then((id) => {
        room.matchId = id;
        if (id) { db.primeSeq(id, engine.state); this.emit.roomState(room); db.persistState(id, engine.state); }
      });
    }
    return room;
  }

  rematch(user: SessionUser, code: string) {
    const room = this.get(code);
    if (room.hostId !== user.uid) throw new RoomError("NOT_HOST", "Only the host can start a rematch");
    if (room.status !== "FINISHED") throw new RoomError("IN_GAME", "Finish the current game first");
    room.status = "LOBBY";
    room.engine = null;
    room.matchId = null;
    this.emit.roomState(room);
    return this.startGame(user, code);
  }

  action(user: SessionUser, code: string, env: ActionEnvelope) {
    const room = this.get(code);
    const engine = room.engine;
    if (!engine || room.status !== "PLAYING") throw new RoomError("NO_GAME", "No game in progress");
    const parsed = gameActionSchema.safeParse(env?.action);
    if (!parsed.success) throw new RoomError("BAD_ACTION", "Malformed action");
    const a = parsed.data;
    // Reject stale or duplicate submissions (double click, replayed packets, old tabs).
    if (env.version !== engine.state.version) throw new RoomError("STALE", "The game has changed — please review the board again");

    const now = this.now();
    const member = room.members.get(user.uid);
    if (!member) throw new RoomError("NOT_MEMBER", "You are not in this room");
    const side = room.sideOf(user.uid);
    const isReferee = member.role === "REFEREE";
    const needSide = () => {
      if (side === null) throw new RoomError("NOT_PLAYER", "Spectators cannot play");
      return side;
    };
    const before = engine.state.history.length;
    switch (a.type) {
      case "play": engine.submitMove(needSide(), user.uid, a.placements as never, now, a.declaredScore ?? null); break;
      case "pass": engine.pass(needSide(), user.uid, now); break;
      case "exchange": engine.exchange(needSide(), user.uid, a.tileIds, now); break;
      case "accept": engine.accept(needSide(), now); break;
      case "challenge": engine.challenge(needSide(), user.uid, now); break;
      case "rechallenge": engine.rechallenge(needSide(), user.uid, now); break;
      case "acceptRuling": engine.acceptChallengeResult(needSide(), now); break;
      case "referee":
        if (!isReferee) throw new RoomError("NOT_REFEREE", "Only the referee can rule");
        engine.refereeRule(user.uid, a.valid, now); break;
      case "draw": engine.drawManual(needSide(), user.uid, a.count, now); break;
      case "resign": engine.resign(needSide(), user.uid, now); break;
      case "pauseRequest": engine.requestPause(needSide()); break;
      case "pauseRespond": engine.respondPause(needSide(), a.accept, now); break;
      case "pause":
        if (!isReferee) throw new RoomError("NOT_REFEREE", "Only the referee can pause directly");
        engine.pause(now); break;
      case "resume":
        if (!isReferee && side === null) throw new RoomError("NOT_PLAYER", "Spectators cannot resume");
        engine.resume(now); break;
    }
    room.lastActivity = now;
    this.afterChange(room, before);
  }

  private afterChange(room: Room, historyBefore: number) {
    const engine = room.engine!;
    const fresh = engine.state.history.slice(historyBefore);
    this.emit.gameState(room);
    for (const n of noticesFor(engine.state, fresh)) this.emit.notice(room, n);
    if (this.persist) db.persistState(room.matchId, engine.state);
    if (engine.state.phase === "FINISHED") {
      room.status = "FINISHED";
      this.emit.roomState(room);
      if (this.persist) {
        // The match id may still be in flight right after start; finalize once known.
        const finalize = () => db.finalizeMatch(room.matchId, engine.state);
        if (room.matchId) finalize(); else setTimeout(finalize, 1500);
      }
    }
  }

  connect(user: SessionUser, code: string) {
    const room = this.get(code);
    const m = room.members.get(user.uid);
    if (!m) return;
    m.sockets++;
    const was = m.connected;
    m.connected = true;
    m.disconnectedAt = null;
    if (!was) this.emit.roomState(room);
  }

  disconnect(user: SessionUser, code: string) {
    const room = this.rooms.get(code);
    const m = room?.members.get(user.uid);
    if (!room || !m) return;
    m.sockets = Math.max(0, m.sockets - 1);
    if (m.sockets === 0) {
      m.connected = false;
      m.disconnectedAt = this.now();
      this.emit.roomState(room);
    }
  }

  // ───────── quick match ─────────
  quickJoin(user: SessionUser, gameType: "1v1" | "2v2") {
    this.quickLeave(user);
    const q = this.queues[gameType];
    q.push(user);
    const need = gameType === "2v2" ? 4 : 2;
    if (q.length >= need) {
      const group = q.splice(0, need);
      const room = this.createRoom(group[0], { ...DEFAULT_ROOM_SETTINGS, gameType, privacy: "PUBLIC" });
      group.slice(1).forEach((u) => this.joinRoom(u, room.code));
      this.startGame(group[0], room.code);
      this.emit.matched?.(group.map((u) => u.uid), room.code);
      return { matched: true, code: room.code };
    }
    return { matched: false, position: q.length, needed: need };
  }

  quickLeave(user: SessionUser) {
    for (const k of ["1v1", "2v2"] as const) this.queues[k] = this.queues[k].filter((u) => u.uid !== user.uid);
  }

  publicRooms(): PublicRoomInfo[] {
    return [...this.rooms.values()]
      .filter((r) => r.status === "LOBBY" && r.settings.privacy === "PUBLIC")
      .map((r) => ({
        code: r.code, host: r.members.get(r.hostId)?.username ?? "?", gameType: r.settings.gameType,
        timeMode: r.settings.timeMode, validation: r.settings.validation,
        players: [0, 1].reduce((s, k) => s + r.sideMembers(k).length, 0), capacity: r.seatsPerSide * 2,
      }));
  }

  // ───────── timers & housekeeping ─────────
  tick() {
    const now = this.now();
    for (const room of this.rooms.values()) {
      const e = room.engine;
      if (room.status === "PLAYING" && e) {
        // A re-challenge must not deadlock if the referee vanished.
        if (e.state.phase === "REFEREE_REVIEW") {
          const ref = room.referee();
          if (!ref || !ref.connected) {
            room.refereeAbsentSince ??= now;
            if (now - room.refereeAbsentSince > 30_000) {
              const before = e.state.history.length;
              e.state.hasReferee = false;
              e.state.phase = "CHALLENGE_RESULT";
              const loser = e.challengeLoser(e.state.challenge!);
              e.rechallenge(loser, e.state.challenge!.rechallenge?.requestedBy ?? "system", now);
              this.emit.notice(room, { kind: "INFO", message: "Referee unavailable — the system made the second check" });
              this.afterChange(room, before);
            }
          } else room.refereeAbsentSince = null;
        }
        const before = e.state.history.length;
        if (e.tick(now)) this.afterChange(room, before);
      }
      const idle = now - room.lastActivity;
      const anyoneHere = [...room.members.values()].some((m) => m.connected);
      if (!anyoneHere && room.status !== "PLAYING" && idle > 30 * 60_000) this.rooms.delete(room.code);
      // Abandon games nobody has touched for 6 hours with no one connected.
      if (!anyoneHere && room.status === "PLAYING" && idle > 6 * 3600_000) {
        if (this.persist) db.markAbandoned(room.matchId);
        this.rooms.delete(room.code);
      }
    }
  }

  /** Restore games that were in progress when the server stopped. */
  async restore() {
    const matches = await db.loadActiveMatches();
    for (const m of matches) {
      const saved = m.state as unknown as (GameState & { savedAt?: number }) | null;
      if (!saved || this.rooms.has(m.roomCode)) continue;
      const settings = roomSettingsSchema.parse(m.settings);
      const hostId = m.players[0]?.userId ?? "";
      const room = new Room(m.roomCode, hostId, settings);
      for (const p of m.players) {
        room.members.set(p.userId, {
          userId: p.userId, username: p.username, avatarColor: p.user.avatarColor, guest: p.user.isGuest,
          role: "PLAYER", side: p.side, connected: false, isHost: p.userId === hostId, sockets: 0, disconnectedAt: Date.now(),
        });
      }
      // Don't charge players for server downtime.
      const down = saved.savedAt ? Date.now() - saved.savedAt : 0;
      if (saved.clock.runningSince) saved.clock.runningSince += down;
      if (saved.challenge?.rechallengeDeadline) saved.challenge.rechallengeDeadline += down;
      delete saved.savedAt;
      room.engine = new GameEngine(saved);
      room.matchId = m.id;
      room.status = "PLAYING";
      db.primeSeq(m.id, saved);
      this.rooms.set(room.code, room);
    }
    if (matches.length) console.log(`[rooms] restored ${matches.length} active game(s)`);
  }
}

export function noticesFor(state: GameState, fresh: MoveRecord[]): GameNotice[] {
  const out: GameNotice[] = [];
  const name = (i: number | null) => (i === null ? "" : state.sides[i]?.name ?? "");
  for (const h of fresh) {
    if (h.type === "PLAY" && h.status === "ACCEPTED" && h.bingo) out.push({ kind: "BINGO", message: `BINGO! ${name(h.sideIndex)} used all 8 tiles (+40)`, sideIndex: h.sideIndex });
    if (h.type === "PLAY" && h.status === "WITHDRAWN") out.push({ kind: "RULING", message: `Challenge upheld — ${name(h.sideIndex)}'s move was withdrawn`, sideIndex: h.sideIndex });
    if (h.type === "CHALLENGE") out.push({ kind: "CHALLENGE", message: `${name(h.sideIndex)} challenged! ${h.note ?? ""}`, sideIndex: h.sideIndex });
    if (h.type === "RECHALLENGE") out.push({ kind: "CHALLENGE", message: `${name(h.sideIndex)} requested a re-challenge`, sideIndex: h.sideIndex });
    if (h.type === "TIMEOUT") out.push({ kind: "TIMEOUT", message: h.note ?? "Time is up", sideIndex: h.sideIndex });
    if (h.type === "PAUSE") out.push({ kind: "PAUSE", message: "Game paused" });
    if (h.type === "RESUME") out.push({ kind: "PAUSE", message: "Game resumed" });
  }
  const lastCh = state.challenges[state.challenges.length - 1];
  if (lastCh?.finalRuling === "VALID" && fresh.some((h) => h.type === "PLAY" && h.status === "ACCEPTED" && h.moveNumber === lastCh.moveNumber)) {
    out.push({ kind: "RULING", message: `Challenge failed — the move stands and ${name(lastCh.challengerSide)} loses the turn` });
  }
  return out;
}

export function errorMessage(e: unknown): { error: string; code?: string; details?: unknown } {
  if (e instanceof GameError) return { error: e.message, code: e.code, details: e.errors };
  if (e instanceof RoomError) return { error: e.message, code: e.code };
  console.error(e);
  return { error: "Unexpected server error", code: "INTERNAL" };
}
