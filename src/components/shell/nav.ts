import { BarChart3, Disc3, History, Sparkles } from "lucide-react";

/** The four places you go every visit. Settings and import live behind the gear. */
export const NAV = [
  { href: "/", label: "Shelf", icon: Disc3 },
  { href: "/charts", label: "Charts", icon: BarChart3 },
  { href: "/recap", label: "Recap", icon: Sparkles },
  { href: "/history", label: "History", icon: History },
] as const;

export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" || pathname.startsWith("/eras") : pathname.startsWith(href);
