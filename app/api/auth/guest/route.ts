import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { randomAvatarColor } from "@/lib/auth/session";
import { withSession } from "@/lib/auth/handlers";

export async function POST() {
  for (let i = 0; i < 5; i++) {
    const username = `Guest${randomInt(1000, 99999)}`;
    const taken = await prisma.user.findUnique({ where: { username } });
    if (taken) continue;
    const u = await prisma.user.create({ data: { username, isGuest: true, avatarColor: randomAvatarColor() } });
    return withSession({ uid: u.id, username: u.username, guest: true, avatarColor: u.avatarColor });
  }
  return Response.json({ error: "Could not create a guest, try again", code: "GUEST_FAILED" }, { status: 500 });
}
