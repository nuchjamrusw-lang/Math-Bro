/**
 * Math&Bro server: Next.js (pages + API) and Socket.IO (game + voice signaling) on one HTTP server.
 * Run with `npm run dev` / `npm start`. Requires a persistent host (not serverless) for WebSockets.
 */
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { setupGameSockets } from "./socket";
import { setupVoiceSignaling } from "./voice-signaling";
import { flushAll, persistState } from "./game-session/persistence";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
// Not HOSTNAME: Docker and Codespaces set it to the machine name, which would bind the wrong interface.
const hostname = process.env.BIND_HOST ?? "0.0.0.0";

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: { origin: process.env.CORS_ORIGIN?.split(",") ?? false, credentials: true },
    pingInterval: 10_000,
    pingTimeout: 20_000,
  });

  const manager = setupGameSockets(io);
  setupVoiceSignaling(io, manager);
  await manager.restore();

  httpServer.listen(port, hostname, () => {
    console.log(`▶ Math&Bro ready on http://localhost:${port} (${dev ? "development" : "production"})`);
  });

  // Hosts stop the process on every deploy / idle spin-down (SIGTERM). Save every live game *now*,
  // so the restored clocks are exact (time while the server is down is never charged).
  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[server] ${signal} received — saving live games`);
    for (const room of manager.rooms.values()) {
      if (room.engine && room.matchId && room.status === "PLAYING") persistState(room.matchId, room.engine.state);
    }
    const timeout = new Promise((r) => setTimeout(r, 8000));
    await Promise.race([flushAll(), timeout]);
    io.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
