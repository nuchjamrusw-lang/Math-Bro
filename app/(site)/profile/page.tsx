import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import { profile } from "@/lib/queries";
import { ProfileView } from "@/components/layout/profile-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile" };

export default async function Page() {
  const me = await getSessionUser();
  if (!me) redirect("/login?next=/profile");
  const data = await profile(me.username);
  if (!data) redirect("/login?next=/profile");
  return <ProfileView data={data} isMe />;
}
