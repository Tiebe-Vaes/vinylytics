"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { isActive, NAV } from "./nav";

export function TopBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-ground">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-6 px-4">
        <Link href="/" className="display text-[28px] leading-none tracking-tight">
          Vinylytics
        </Link>
        <nav aria-label="Main" className="hidden flex-1 items-center gap-6 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(pathname, n.href) ? "page" : undefined}
              className={cn(
                "text-sm font-semibold text-muted-text transition-colors duration-[var(--dur)] hover:text-text",
                "aria-[current=page]:text-text aria-[current=page]:underline aria-[current=page]:underline-offset-[6px]"
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/settings"
          aria-label="Settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className="flex size-10 items-center justify-center text-muted-text transition-colors hover:text-text aria-[current=page]:text-text"
        >
          <Settings className="size-5" strokeWidth={1.75} />
        </Link>
      </div>
    </header>
  );
}
