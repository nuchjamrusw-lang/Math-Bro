/** Stateless JWT session shared by Next.js route handlers and the Socket.IO server. */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "mb_session";
const MAX_AGE_S = 60 * 60 * 24 * 30;

export interface SessionUser {
  uid: string;
  username: string;
  guest: boolean;
  avatarColor: string;
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set in production");
  return new TextEncoder().encode(s || "dev-only-insecure-secret-change-me");
}

export async function signSession(u: SessionUser): Promise<string> {
  return new SignJWT({ ...u })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.uid !== "string" || typeof payload.username !== "string") return null;
    return { uid: payload.uid, username: payload.username, guest: !!payload.guest, avatarColor: String(payload.avatarColor ?? "#344CDB") };
  } catch {
    return null;
  }
}

export function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_S,
  secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
};

export const AVATAR_COLORS = ["#344CDB", "#2EAD78", "#E45B5B", "#E8A33D", "#8B5CF6", "#0EA5E9", "#EC4899", "#14B8A6"];
export function randomAvatarColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}
