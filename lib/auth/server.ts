import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionUser } from "./session";

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}
