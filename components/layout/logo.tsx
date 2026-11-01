import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-grid size-8 place-items-center rounded-[10px] bg-primary text-[15px] font-bold text-white shadow-[0_2px_6px_rgb(52_76_219/0.35)]", className)}>
      <span className="-mt-px">&amp;</span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold tracking-tight", className)} aria-label="Math&Bro home">
      <LogoMark />
      <span className="text-[17px]">Math<span className="text-primary">&amp;</span>Bro</span>
    </Link>
  );
}
