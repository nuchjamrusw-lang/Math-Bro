/**
 * Math&Bro server: Next.js (pages + API) and Socket.IO (game + voice signaling) on one HTTP server.
 * Run with `npm run dev` / `npm start`. Requires a persistent host (not serverless) for WebSockets.
 */
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { setupGameSockets } from "./socket";
import { setupVoiceSignaling } from "./voice-signaling";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
