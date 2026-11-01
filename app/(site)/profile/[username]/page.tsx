import { notFound } from "next/navigation";
import { profile } from "@/lib/queries";
import { ProfileView } from "@/components/layout/profile-view";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const data = await profile(decodeURIComponent(username));
  if (!data) notFound();
  return <ProfileView data={data} />;
}
