import { Suspense } from "react";
import { Lobby } from "@/components/lobby/lobby";
import { RequireUser } from "@/components/lobby/require-user";

export const metadata = { title: "Play" };

export default function Page() {
  return <RequireUser><Suspense><Lobby /></Suspense></RequireUser>;
}
