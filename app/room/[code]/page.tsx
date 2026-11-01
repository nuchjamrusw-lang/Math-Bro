import { RoomClient } from "@/components/room/room-client";
import { RequireUser } from "@/components/lobby/require-user";

export const metadata = { title: "Game room" };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RequireUser><RoomClient code={code.toUpperCase()} /></RequireUser>;
}
