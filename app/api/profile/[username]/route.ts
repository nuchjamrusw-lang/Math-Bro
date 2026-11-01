import { profile } from "@/lib/queries";
export async function GET(_: Request, ctx: { params: Promise<{ username: string }> }) {
  const { username } = await ctx.params;
  const p = await profile(decodeURIComponent(username));
  return p ? Response.json(p) : Response.json({ error: "Not found" }, { status: 404 });
}
