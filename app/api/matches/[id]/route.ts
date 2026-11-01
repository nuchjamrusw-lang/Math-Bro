import { matchForReplay } from "@/lib/queries";
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const m = await matchForReplay(id);
  return m ? Response.json(m) : Response.json({ error: "Match not found or still in progress" }, { status: 404 });
}
