import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div><p className="text-6xl font-bold text-primary">404</p><p className="mt-2 text-muted">This page doesn&apos;t exist.</p><Button className="mt-6" asChild><Link href="/">Home</Link></Button></div>
    </div>
  );
}
