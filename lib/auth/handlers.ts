import { NextResponse } from "next/server";
import { SESSION_COOKIE, cookieOptions, signSession, type SessionUser } from "./session";

export async function withSession(user: SessionUser, body: unknown = { user }) {
  const res = NextResponse.json(body);
  res.cookies.set(SESSION_COOKIE, await signSession(user), cookieOptions);
  return res;
}

export function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export const USERNAME_RE = /^[a-zA-Z0-9_฀-๿]{3,20}$/;
