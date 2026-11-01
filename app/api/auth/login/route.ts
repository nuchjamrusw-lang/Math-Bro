import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, withSession } from "@/lib/auth/handlers";

const schema = z.object({ username: z.string().min(1).max(40), password: z.string().min(1).max(100) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter your username and password", 400, "LOGIN_REQUIRED");
  const u = await prisma.user.findFirst({ where: { username: { equals: parsed.data.username, mode: "insensitive" }, isGuest: false } });
  if (!u?.passwordHash || !(await bcrypt.compare(parsed.data.password, u.passwordHash))) {
    return jsonError("Incorrect username or password", 401, "BAD_LOGIN");
  }
  return withSession({ uid: u.id, username: u.username, guest: false, avatarColor: u.avatarColor });
}
