import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { randomAvatarColor } from "@/lib/auth/session";
import { getSessionUser } from "@/lib/auth/server";
import { USERNAME_RE, jsonError, withSession } from "@/lib/auth/handlers";

const schema = z.object({ username: z.string().regex(USERNAME_RE), password: z.string().min(6).max(100) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Username must be 3–20 letters/numbers/_ and password at least 6 characters");
  const { username, password } = parsed.data;
  const exists = await prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
  if (exists) return jsonError("That username is taken", 409);
  const passwordHash = await bcrypt.hash(password, 10);
  const current = await getSessionUser();
  // Upgrading a guest keeps their match history.
  const user = current?.guest
    ? await prisma.user.update({ where: { id: current.uid }, data: { username, passwordHash, isGuest: false } }).catch(() => null)
    : null;
  const u = user ?? (await prisma.user.create({ data: { username, passwordHash, avatarColor: randomAvatarColor() } }));
  return withSession({ uid: u.id, username: u.username, guest: false, avatarColor: u.avatarColor });
}
