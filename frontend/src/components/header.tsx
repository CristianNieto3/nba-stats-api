"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/players", label: "Players" },
  { href: "/leaders", label: "Leaders" },
  { href: "/compare", label: "Compare" },
] as const;

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-hairline bg-page">
      <div className="mx-auto max-w-6xl px-4 flex items-center gap-6 h-14">
        <Link
          href="/"
          className="font-display font-bold text-xl tracking-wide uppercase text-ink hover:text-accent transition-colors"
        >
          NBA Stats Hub
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 h-full">
          {NAV.map((item) => {
            const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`font-display uppercase tracking-wider text-[15px] px-3 h-full flex items-center border-b-2 transition-colors ${
                  current
                    ? "border-accent text-ink font-semibold"
                    : "border-transparent text-ink-2 hover:text-ink hover:border-hairline"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <CommandPalette />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
