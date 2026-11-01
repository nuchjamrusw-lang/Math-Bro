# Math&Bro — Real-time Multiplayer A-Math

> **Think Fast. Play Smart. Challenge Everything.**

Math&Bro is a web game for A-Math, the crossword-style equation board game, played online against other people in real time.

- **Server-authoritative game engine.** The engine handles the 100-tile bag, the 15×15 premium board, an exact
  (rational-number) equation validator, scoring with a full breakdown, and the end-of-game rules.
- **Real-time multiplayer.** Socket.IO supports 1 vs 1 and 2 vs 2 with a shared team rack. You can create a room,
  join one with a code, use quick match, or browse public rooms. Spectators and a referee can join a room, and
  players can reconnect or refresh without losing the game.
- **Challenge, re-challenge and referee** support, or a **Strict mode** that rejects incorrect equations.
- **Chess clock** with 5 / 12 / 22 minute or custom time controls, and overtime penalties (−10 points per started minute).
  The server keeps the time, so a browser refresh does not change it.
- **WebRTC voice chat** uses its own signaling namespace, so problems with voice never affect the game.
- **Match history, frame-by-frame replay, profiles and leaderboard** are stored in PostgreSQL through Prisma.
- **Practice mode** runs the same engine in the browser for two players on one device.
- **Three languages: ไทย / English / 中文.** Switch from the language menu in the navbar or game header. The choice
  is stored in a cookie. Without a cookie, the language follows the browser and falls back to Thai.
- **Score and tile management modes A–D:** automatic or manual scoring, and automatic or manual tile drawing.

## Run without a computer (iPad / browser only)

- **GitHub Codespaces:** on the repo page choose **Code → Codespaces → Create codespace**.
  `.devcontainer/` starts Node 22 and PostgreSQL and runs `npm install` and `prisma db push`.
  When it finishes, run `npm run dev` in the terminal and open the forwarded port 3000.
- **Permanent link (Railway, Render, …):** deploy the repo with the `Dockerfile`, add a PostgreSQL database,
  and set `DATABASE_URL` and `AUTH_SECRET`.

## Quick start

Requirements: Node 20+ and PostgreSQL 14+.

```bash
cp .env.example .env            # set DATABASE_URL and AUTH_SECRET
docker compose up -d            # optional: local Postgres on :5432
npm install
npx prisma db push              # create tables
npm run dev                     # http://localhost:3000
```

Production:

```bash
npm run build && npm start      # PORT=3000 by default
```

Or build the image with `docker build -t mathbro .`. The container runs `prisma db push` and then starts the server.

| Env var | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Secret for HS256 session JWTs. **Required in production.** |
| `PORT` | HTTP port (default 3000) |
| `BIND_HOST` | Interface to listen on (default `0.0.0.0`) |
| `COOKIE_SECURE` | `true`/`false`. Defaults to `true` in production; set `false` only when serving over plain HTTP. |
| `NEXT_PUBLIC_ICE_SERVERS` | JSON array of `RTCIceServer`. Add a TURN server so voice works behind strict NATs. |
| `CORS_ORIGIN` | Comma-separated origins allowed to open sockets from another domain (usually not needed) |

## Tests

```bash
npm test                        # 89 unit and integration tests (engine, rules, scoring, timer, sockets)
npm run typecheck
# Browser play-through: two real browsers, voice chat, challenge, passes, result screen and mobile layout
npm run build && PORT=3100 npm start &
npx tsx e2e/smoke.ts http://localhost:3100 ./e2e-shots
```

| File | Covers |
|---|---|
| `tests/math-validator.test.ts` | Operator precedence, multi-digit numbers, leading zeros, unary minus, division by zero, exact fractions, chained `=` |
| `tests/board-and-tiles.test.ts` | 225 cells, center star, premium counts and symmetry, unique coordinates, the 100-tile distribution, draw-order ranking |
| `tests/game-engine.test.ts` | All 20 required cases from the brief: first move, connections, crossing equations, premium reuse, bingo, strict mode, challenge and re-challenge, exchange, passes, going out, timer penalties, view privacy, serialisation |
| `tests/rules-and-modes.test.ts` | Equation-premium stacking, manual score and tile modes, ending on timeout or overtime cap, exchange-as-pass option, replay reconstruction |
| `tests/multiplayer.test.ts` | Real Socket.IO clients: authentication, rack privacy, stale/duplicate action rejection, out-of-turn rejection, challenge flow, exchange, pass-out, rematch, reconnect, 2v2 shared rack, quick match |

## Architecture

```
app/                     Next.js App Router pages and API routes
  (site)/                landing, how-to-play, leaderboard, login/signup, profile, play (lobby)
  room/[code]/           live game room (waiting room → game → result)
  practice/              local pass-and-play
  replay/[id]/           replay viewer
  api/                   auth (signup/login/guest/logout/me), leaderboard, profile, matches
components/
  board/ tile/ rack/     board grid (premiums from config), tiles, rack
  scoreboard/ timer/     player cards, chess clock, score breakdown
  challenge/             challenge / re-challenge / referee panel
  voice-chat/            WebRTC hook and controls
  game/                  GameView (shared by online and local), dialogs, preview, history, results, drag & drop
  lobby/ room/ replay/   lobby tabs, create room, waiting room, replay viewer
  ui/                    design-system primitives (shadcn-style: Button, Card, Dialog, …)
lib/
  game-rules/            ← configuration: tiles, board layout, rule options (no logic)
  math-validator/        tokenizer, parser, exact Fraction evaluator, error codes
  scoring-engine/        per-equation and per-move scoring with breakdown
  tile-manager/          seeded bag, draws, rack points, draw-order rank
  timer-engine/          pure chess-clock functions and penalties
  game-engine/           GameEngine state machine, placement analysis, replay frames, per-viewer views
  i18n/                  en/th/zh dictionaries (type-checked to have identical keys), how-to-play content,
                         server getT(), client useI18n(), error/notice formatting
  room-settings.ts       Create Room settings → engine rules
  protocol.ts            socket message types and zod schemas
server/
  index.ts               one HTTP server: Next.js + Socket.IO
  game-session/          RoomManager (authoritative rooms and games) and persistence
  socket/                game namespace wiring (auth middleware, acks)
  voice-signaling/       /voice namespace that relays SDP/ICE and mic status only
prisma/schema.prisma     User, Match, MatchPlayer, MoveRecord, ChallengeRecord
docs/RULES_CONFIG.md     every configurable rule explained
e2e/                     Playwright play-through script
```

### Game engine

`lib/game-engine/engine.ts` has no dependencies on React, Next.js or Socket.IO. It is a deterministic state
machine with these phases: `WAITING → PLAYING ⇄ CHALLENGE_WINDOW → CHALLENGE_RESULT → REFEREE_REVIEW → … → FINISHED`.

- **Deterministic and serialisable.** The bag uses a seeded PRNG whose state is part of `GameState`, so a game can
  be saved to the database and restored after a server restart.
- **Moves are checked in two layers.** `placement.ts` checks geometry: a single line, contiguity, overlap, the
  center square on the first move, and a connection on later moves. It also extracts every horizontal and
  vertical equation the move creates or extends. `math-validator` then checks each equation. If any one
  equation is wrong, the whole move is wrong.
- **Scoring.** Each new tile's points are multiplied by its piece premium. The tiles are summed, and the sum is
  multiplied by the equation premiums under new tiles. Every equation the move forms is scored, and a bingo adds
  +40. Premiums under tiles placed in earlier turns are never used again.
- **Challenge mode.** A submitted move goes on the board as *pending*, and the clock passes to the opponent. While
  the move is pending, the engine hides whether it is valid from both players. The opponent can **Challenge**, or
  **Accept** by touching their rack or acting. Tiles are drawn only once the move is accepted, so withdrawing a
  move restores the earlier state exactly. Each challenge record stores who challenged whom, the equations, the
  first check, the re-challenge request, the second check (system or referee), the final ruling and timestamps.
- **Per-viewer projection.** `view(viewerSide)` never includes the bag or the opponent's rack. Rack snapshots in
  the move history are removed until the game ends.

### Fair play and security

- The server owns all game state. Clients send only intents (`play`, `pass`, `exchange`, `challenge`, …),
  validated with zod and checked against whose turn it is and who owns which seat.
- Each action carries the `version` of the state the client saw. Stale or duplicate submissions, such as
  double clicks or an old tab, are rejected.
- The server keeps the clock using its own timestamps. Clients only display remaining time, corrected for the
  difference between client and server clocks.
- Sessions are httpOnly signed cookies, used by both the HTTP routes and the Socket.IO handshake.
- Every event is written to `MoveRecord`, and every challenge to `ChallengeRecord`. The full engine snapshot is
  kept in `Match.state` for crash recovery. Time while the server is down is not charged to the players.

### Technology choices

| Area | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn-style components (Radix Dialog + CVA), Framer Motion, lucide icons | As requested. The UI primitives live in the repo (`components/ui`), so the design system is ours to edit. |
| Real-time | Socket.IO on a **custom Node server** (`server/index.ts`) | Games need long-lived WebSocket connections and in-memory state, which serverless Vercel functions cannot hold. Next.js and Socket.IO therefore share one Node process. |
| Voice | WebRTC mesh (up to 4 peers), signaling on the `/voice` Socket.IO namespace | Audio goes directly between players. Signaling is kept apart from the game channel. |
| Database | PostgreSQL + Prisma | As requested |
| Auth | Our own credentials and guest login: bcrypt + signed JWT cookie (jose) | Auth.js does not expose its session to a separate Socket.IO server in a simple way. A small, explicit JWT cookie is checked identically by API routes and socket handshakes. |
| Tests | Vitest, socket.io-client, Playwright | |

### Deployment

The game server needs a host that keeps processes running and supports WebSockets, such as Railway, Render,
Fly.io or a VPS. Use the Dockerfile and a managed PostgreSQL instance. Vercel can host only the pages, so this
project runs everything as one service to keep sessions and sockets on the same origin. To split it later,
deploy `server/` separately and point the client socket at it with `CORS_ORIGIN`.

## Rules that need your confirmation

These rules were unclear in the brief or need an official reference. Each one is configurable
(see [docs/RULES_CONFIG.md](docs/RULES_CONFIG.md)), and the defaults are listed below.

1. **Board layout.** ✅ Confirmed against the reference board image the project owner supplied. The
   squares at (4,4), (4,10), (10,4) and (10,10) are 3× Piece. The center ★ counts as 3× Piece.
2. **Unary minus.** A negative sign is allowed only at the start of an equation side, so `3 × -2` is rejected
   because two operators touch.
3. **Tiles 10–20** cannot be joined with other digits. Numbers are at most 3 digits long. Chained `=` signs are allowed.
4. **Pass-out rule.** The game ends after 3 consecutive passes counted across both sides. A play resets the count.
   Exchanges, withdrawn moves and turns lost to a failed challenge do **not** count as passes.
5. **Two equation premiums in one equation multiply** (2× and 3× give 6×).
6. **Going out.** The player who goes out gains twice the opponent's rack points, and the opponent loses nothing.
   On a pass-out or timeout end, each side loses its own rack points.
7. **Running out of time.** By default play continues in overtime with a penalty and no cap.
   *End on timeout* is a room option, and `maxOvertimeMinutes` sets a cap.
8. **Re-challenge.** Only the side that lost the first ruling may request one, within 20 s, with the clocks
   stopped. A referee in the room decides. Without a referee, the system checks a second time and both results
   are recorded. If the referee is absent for 30 s, the system decides.
9. **Exchange.** The bag must hold at least 5 tiles, and at least as many tiles as you want to exchange.
10. **Draw for first move.** The drawn tiles go back into the bag, the bag is shuffled, and then 8 tiles are
    dealt to each side, starter first.
11. **Manual tile mode (B and D).** A player cannot remove tiles from a rack in a digital game. In these modes the
    system therefore does not refill racks; players press **Draw** themselves, with confirmation. The opening
    deal is still automatic.
12. **2 vs 2.** Either teammate may act for the team on its turn, and every move records which account made it.
