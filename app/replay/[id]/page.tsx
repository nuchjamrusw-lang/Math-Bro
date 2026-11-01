import { notFound } from "next/navigation";
import { matchForReplay } from "@/lib/queries";
import { ReplayViewer, type ReplayData } from "@/components/replay/replay-viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Replay" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await matchForReplay(id);
  if (!m) notFound();
  return <ReplayViewer data={JSON.parse(JSON.stringify(m)) as ReplayData} />;
}
