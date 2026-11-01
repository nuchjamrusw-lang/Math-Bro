"use client";
import { io, type Socket } from "socket.io-client";
import type { Ack } from "@/lib/protocol";

let socket: Socket | null = null;

/** One shared game socket per tab. Auth comes from the httpOnly session cookie. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({ path: "/socket.io", withCredentials: true, transports: ["websocket", "polling"], reconnectionDelayMax: 4000 });
  }
  return socket;
}

export function resetSocket() {
  socket?.disconnect();
  socket = null;
}

export function request<T = unknown>(event: string, payload?: unknown, timeoutMs = 8000): Promise<Ack<T>> {
  const s = getSocket();
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ ok: false, error: "The server did not respond — check your connection", code: "TIMEOUT" }), timeoutMs);
    s.emit(event, payload, (ack: Ack<T>) => { clearTimeout(t); resolve(ack); });
  });
}
