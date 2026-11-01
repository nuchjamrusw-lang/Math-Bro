"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut, User } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/layout/avatar";
import { useAuth } from "@/lib/client/auth";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/how-to-play", label: "How to Play" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/play", label: "Play" },
];

export function Navbar() {
  const path = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={cn("rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:text-ink", (l.href === "/" ? path === "/" : path.startsWith(l.href)) && "text-ink")}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-[#eef0f4]">
                <Avatar name={user.username} color={user.avatarColor} size={28} />
                <span className="text-sm font-medium">{user.username}</span>
                {user.guest && <span className="rounded-full bg-[#eef0f4] px-2 text-[11px] font-semibold text-muted">Guest</span>}
              </Link>
              <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out"><LogOut /></Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild><Link href="/login">Log in</Link></Button>
              <Button asChild><Link href="/signup">Sign up</Link></Button>
            </>
          )}
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</Button>
      </nav>
      {open && (
        <div className="border-t border-line bg-surface px-4 py-3 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium">{l.label}</Link>
          ))}
          <div className="mt-2 border-t border-line pt-2">
            {user ? (
              <div className="flex items-center justify-between">
                <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium"><User className="size-4" />{user.username}</Link>
                <Button variant="ghost" size="sm" onClick={logout}>Log out</Button>
              </div>
            ) : (
              <div className="flex gap-2 px-1 pt-1">
                <Button variant="secondary" className="flex-1" asChild><Link href="/login" onClick={() => setOpen(false)}>Log in</Link></Button>
                <Button className="flex-1" asChild><Link href="/signup" onClick={() => setOpen(false)}>Sign up</Link></Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
