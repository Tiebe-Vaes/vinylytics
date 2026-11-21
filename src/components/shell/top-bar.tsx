"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Settings, X } from "lucide-react";
import Image from "next/image";
import { LibrarySearch } from "@/components/music/library-search";
import { cn } from "@/lib/utils";
import { isActive, NAV } from "./nav";

export function TopBar() {
  const pathname = usePathname();
  // On a phone the search field opens over the logo, so neither has to shrink to a stub.
  const [searching, setSearching] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-ground">
      <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-2 px-4 sm:gap-4">
        <Link href="/" aria-label="Vinylytics shelf" className={cn("min-h-11 shrink-0 items-center", searching ? "hidden md:flex" : "flex")}>
          <Image src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/brand/vinylytics.svg`} width={132} height={36} alt="Vinylytics" className="h-auto w-24 sm:w-32" unoptimized />
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
        <div className={cn("min-w-0 flex-1 md:flex-none", searching ? "flex" : "hidden md:flex")}><LibrarySearch autoFocus={searching} /></div>
        <button type="button" onClick={() => setSearching(!searching)} aria-label={searching ? "Close search" : "Search"} aria-expanded={searching}
          className="flex size-11 shrink-0 items-center justify-center text-muted-text hover:text-text md:hidden">
          {searching ? <X className="size-5" aria-hidden /> : <Search className="size-5" strokeWidth={1.75} aria-hidden />}
        </button>
        <Link
          href="/settings"
          aria-label="Settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className="flex size-11 shrink-0 items-center justify-center text-muted-text transition-colors hover:text-text aria-[current=page]:text-text"
        >
          <Settings className="size-5" strokeWidth={1.75} />
        </Link>
      </div>
    </header>
  );
}
