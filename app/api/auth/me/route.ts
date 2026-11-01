import { getSessionUser } from "@/lib/auth/server";

export async function GET() {
  return Response.json({ user: await getSessionUser() });
}
