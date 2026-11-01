import { leaderboard } from "@/lib/queries";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ players: await leaderboard(50) });
}
