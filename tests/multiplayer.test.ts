/**
 * End-to-end multiplayer test over real Socket.IO connections (no browser):
 * create room → join → start → play / challenge / exchange / pass → game over.
 */
import { createServer, type Server as HttpServer } from "node:http";
import { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as ioc, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupGameSockets } from "@/server/socket";
import { signSession } from "@/lib/auth/session";
import type { GameView } from "@/lib/game-engine";
import type { RoomSnapshot } from "@/lib/protocol";
import type { RoomManager } from "@/server/game-session/room-manager";

let http: HttpServer;
let io: Server;
let manager: RoomManager;
let url: string;

beforeAll(async () => {
  http = createServer();
  io = new Server(http);
  manager = setupGameSockets(io, { persist: false });
  await new Promise<void>((r) => http.listen(0, r));
  url = `http://localhost:${(http.address() as AddressInfo).port}`;
});
afterAll(() => { io.close(); http.close(); });

class Client {
  socket!: Socket;
  view: GameView | null = null;
  room: RoomSnapshot | null = null;
  constructor(public uid: string, public name: string) {}
  async connect() {
    const token = await signSession({ uid: this.uid, username: this.name, guest: true, avatarColor: "#000" });
    this.socket = ioc(url, { auth: { token }, transports: ["websocket"], forceNew: true });
    this.socket.on("game:state", (p: { view: GameView }) => (this.view = p.view));
    this.socket.on("room:state", (r: RoomSnapshot) => (this.room = r));
    await new Promise<void>((res, rej) => { this.socket.on("connect", () => res()); this.socket.on("connect_error", rej); });
    return this;
  }
  emit<T = unknown>(ev: string, payload: unknown): Promise<{ ok: boolean; data?: T; error?: string; code?: string }> {
    return new Promise((r) => this.socket.emit(ev, payload, r));
  }
  act(code: string, action: unknown) {
    return this.emit("game:action", { code, action, version: this.view!.version });
  }
  async waitFor(pred: (c: Client) => boolean, ms = 2000) {
    const t = Date.now();
    while (!pred(this)) {
      if (Date.now() - t > ms) throw new Error("timeout waiting for state");
      await new Promise((r) => setTimeout(r, 10));
    }
  }
}

describe("multiplayer over sockets", () => {
  it("rejects unauthenticated sockets", async () => {
    const s = ioc(url, { transports: ["websocket"], forceNew: true });
    const err = await new Promise<Error>((r) => s.on("connect_error", r));
    expect(err.message).toBe("UNAUTHENTICATED");
    s.close();
  });

  it("plays a 1v1 game: create, join, start, challenge, exchange, pass to the end", async () => {
    const a = await new Client("ua", "Ann").connect();
    const b = await new Client("ub", "Ben").connect();
    const spec = await new Client("us", "Sam").connect();

    const created = await a.emit<{ code: string }>("room:create", { gameType: "1v1", timeMode: "RAPID", validation: "CHALLENGE" });
    expect(created.ok).toBe(true);
    const code = created.data!.code;
    expect(code).toMatch(/^[A-Z0-9]{6}$/);

    expect((await b.emit("room:join", { code })).ok).toBe(true);
    expect((await spec.emit("room:join", { code })).ok).toBe(true);
    await a.waitFor((c) => c.room?.members.length === 3);
    expect(a.room!.members.find((m) => m.userId === "us")!.role).toBe("SPECTATOR");

    expect((await b.emit("room:start", { code })).code).toBe("NOT_HOST");
    expect((await a.emit("room:start", { code })).ok).toBe(true);
    await a.waitFor((c) => !!c.view);
    await b.waitFor((c) => !!c.view);
    await spec.waitFor((c) => !!c.view);

    // Racks are private
    const sideA = a.view!.viewerSide!;
    const sideB = b.view!.viewerSide!;
    expect(a.view!.sides[sideA].rack).toHaveLength(8);
    expect(a.view!.sides[sideB].rack).toBeUndefined();
    expect(spec.view!.viewerSide).toBeNull();
    expect(spec.view!.sides.every((s) => s.rack === undefined)).toBe(true);
    expect(a.view!.clock.initialMs).toBe(12 * 60_000);

    const mover = a.view!.turn === sideA ? a : b;
    const other = mover === a ? b : a;
    const moverSide = mover.view!.viewerSide!;

    // Out-of-turn actions are rejected
    expect((await other.act(code, { type: "pass" })).code).toBe("NOT_YOUR_TURN");
    // Stale version is rejected (duplicate submit protection)
    const stale = await other.emit("game:action", { code, action: { type: "pass" }, version: -1 });
    expect(stale.code).toBe("STALE");

    // The mover plays a deliberately unverified single tile on the star → geometry error (no equation)
    const tile = mover.view!.sides[moverSide].rack![0];
    const bad = await mover.act(code, { type: "play", placements: [{ tileId: tile.id, row: 7, col: 7, value: tile.kind === "blank" ? "1" : tile.kind === "choice" ? (tile.face === "+/-" ? "+" : "×") : undefined }] });
    expect(bad.ok).toBe(false);
    expect(bad.code).toBe("NO_EQUATION_FORMED");

    // Forge a valid first move by giving the mover known tiles (server-side test hook)
    const engine = manager.get(code).engine!;
    const r = engine.state.sides[moverSide].rack;
    const want = ["6", "=", "6"];
    for (const f of want) {
      if (!r.some((t) => t.face === f && !want.slice(0, 0).includes(f))) {
        const i = engine.state.bag.findIndex((t) => t.face === f);
        const swapped = r.shift()!;
        r.push(engine.state.bag.splice(i, 1, swapped)[0]);
      }
    }
    // ensure two '6'
    while (r.filter((t) => t.face === "6").length < 2) {
      const i = engine.state.bag.findIndex((t) => t.face === "6");
      const j = r.findIndex((t) => t.face !== "6" && t.face !== "=");
      const swapped = r.splice(j, 1)[0];
      r.push(engine.state.bag.splice(i, 1, swapped)[0]);
    }
    await mover.emit("game:sync", { code }).then((res) => (mover.view = (res.data as { view: GameView }).view));
    const rack = mover.view!.sides[moverSide].rack!;
    const six = rack.filter((t) => t.face === "6");
    const eq = rack.find((t) => t.face === "=")!;
    const play = await mover.act(code, { type: "play", placements: [
      { tileId: six[0].id, row: 7, col: 6 }, { tileId: eq.id, row: 7, col: 7 }, { tileId: six[1].id, row: 7, col: 8 },
    ] });
    expect(play.ok).toBe(true);
    await other.waitFor((c) => c.view!.phase === "CHALLENGE_WINDOW");
    expect(other.view!.board[7][7]!.value).toBe("=");

    // Opponent challenges a correct move → loses the turn after accepting the ruling
    expect((await other.act(code, { type: "challenge" })).ok).toBe(true);
    await other.waitFor((c) => c.view!.phase === "CHALLENGE_RESULT");
    expect(other.view!.challenge!.first.valid).toBe(true);
    expect((await other.act(code, { type: "acceptRuling" })).ok).toBe(true);
    await mover.waitFor((c) => c.view!.phase === "PLAYING" && c.view!.turn === moverSide);
    expect(mover.view!.sides[moverSide].score).toBe(7);
    expect(mover.view!.sides[moverSide].rackCount).toBe(8);

    // Mover exchanges two tiles (turn passes)
    const ex = mover.view!.sides[moverSide].rack!.slice(0, 2).map((t) => t.id);
    expect((await mover.act(code, { type: "exchange", tileIds: ex })).ok).toBe(true);
    await other.waitFor((c) => c.view!.turn !== moverSide);

    // Three consecutive passes end the game
    expect((await other.act(code, { type: "pass" })).ok).toBe(true);
    await mover.waitFor((c) => c.view!.turn === moverSide);
    expect((await mover.act(code, { type: "pass" })).ok).toBe(true);
    await other.waitFor((c) => c.view!.turn !== moverSide);
    expect((await other.act(code, { type: "pass" })).ok).toBe(true);
    await a.waitFor((c) => c.view!.phase === "FINISHED");
    await spec.waitFor((c) => c.view!.phase === "FINISHED");
    const res = a.view!.result!;
    expect(res.reason).toBe("PASSES");
    expect(res.sides[moverSide].boardScore).toBe(7);
    // finished games reveal racks for review
    expect(spec.view!.sides.every((s) => Array.isArray(s.rack))).toBe(true);
    await a.waitFor((c) => c.room!.status === "FINISHED");

    // Play again (rematch) starts a fresh game in the same room
    expect((await a.emit("room:rematch", { code })).ok).toBe(true);
    await a.waitFor((c) => c.view!.phase === "PLAYING" && c.view!.moveNumber === 0);

    // Reconnect: a new socket for B gets the current state
    b.socket.close();
    await a.waitFor((c) => c.room!.members.find((m) => m.userId === "ub")!.connected === false);
    const b2 = await new Client("ub", "Ben").connect();
    expect((await b2.emit("room:join", { code })).ok).toBe(true);
    await b2.waitFor((c) => !!c.view && c.view.viewerSide === sideB);
    expect(b2.view!.sides[sideB].rack).toHaveLength(8);
    [a, b2, spec].forEach((c) => c.socket.close());
  });

  it("supports 2v2 with a shared team rack and quick match pairing", async () => {
    const cs = await Promise.all(["p1", "p2", "p3", "p4"].map((id) => new Client(id, id.toUpperCase()).connect()));
    const matched = cs.map((c) => new Promise<string>((r) => c.socket.once("quick:matched", (p: { code: string }) => r(p.code))));
    for (const c of cs) await c.emit("quick:join", { gameType: "2v2" });
    const codes = await Promise.all(matched);
    expect(new Set(codes).size).toBe(1);
    const code = codes[0];
    for (const c of cs) await c.emit("room:join", { code });
    for (const c of cs) await c.waitFor((x) => !!x.view);
    const v = cs[0].view!;
    expect(v.sides.every((s) => s.members.length === 2)).toBe(true);
    // Teammates see the same rack; opponents don't.
    const bySide = (side: number) => cs.filter((c) => c.view!.viewerSide === side);
    const [t1, t2] = bySide(0);
    expect(t1.view!.sides[0].rack!.map((t) => t.id)).toEqual(t2.view!.sides[0].rack!.map((t) => t.id));
    expect(t1.view!.sides[1].rack).toBeUndefined();
    // Either teammate of the side to move may act; the actor is recorded.
    const turnSide = v.turn;
    const actor = bySide(turnSide)[1];
    expect((await actor.act(code, { type: "pass" })).ok).toBe(true);
    await cs[0].waitFor((c) => c.view!.history.some((h) => h.type === "PASS"));
    expect(cs[0].view!.history.find((h) => h.type === "PASS")!.playerId).toBe(actor.uid);
    cs.forEach((c) => c.socket.close());
  });
});
