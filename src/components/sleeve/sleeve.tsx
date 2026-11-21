import Link from "next/link";
import { ViewTransition } from "react";
import { ArrowUpRight } from "lucide-react";
import { inkHex, inkText } from "@/lib/ink";
import type { EraView } from "@/lib/spotify/eras-data";
import { cn } from "@/lib/utils";
import { Tilt } from "@/components/motion/tilt";
import { eraHref } from "@/lib/href";

const monthYear = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

export const eraSpan = (era: Pick<EraView, "start" | "end">) => `${monthYear(era.start)} – ${monthYear(era.end)}`;
export const eraHours = (era: Pick<EraView, "minutes">) => Math.round(era.minutes / 60);

export function Sleeve({ era, size = "shelf", href, className }: {
  era: EraView; size?: "shelf" | "hero"; href?: string | null; className?: string;
}) {
  const bg = inkHex(era.ink);
  const hero = size === "hero";
  const face = (
    <div className={cn("relative flex aspect-square w-full flex-col justify-between gap-2 overflow-hidden", hero ? "p-6 md:p-7" : "p-4")}
      style={{ background: bg, color: inkText(bg) }}>
      {/* Fixed slots: hours on top, name and dates at the bottom, so cards line up whatever the name's length. */}
      <p className={cn("flex items-baseline gap-2 leading-none", hero ? "text-[clamp(3.5rem,9vw,7rem)]" : "text-6xl")}>
        <span className="display">{eraHours(era)}</span><span className="text-sm font-bold tracking-widest uppercase">hours</span>
      </p>
      {era.cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- preserve the source artwork and its aspect ratio.
        <img src={era.cover} alt={`Artwork from ${era.name}`} loading={hero ? "eager" : "lazy"}
          className="min-h-0 w-[50%] flex-1 self-end object-contain object-right" />
      ) : <div aria-hidden="true" className="min-h-0 flex-1" />}
      <div className="shrink-0">
        <h2 className={cn("display line-clamp-2", hero ? "text-[clamp(2.2rem,6vw,4.75rem)]" : "text-[clamp(2rem,5vw,2.75rem)]")}>{era.name}</h2>
        <div className="mt-3 flex items-end justify-between gap-3 text-xs font-semibold">
          <div className="min-w-0"><span className="block truncate">{era.lead}</span><span>{eraSpan(era)}</span></div>
          {href !== null && <ArrowUpRight className="hover-reveal size-6 shrink-0 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />}
        </div>
      </div>
    </div>
  );
  // Morph only between the shelf and the era page; stay still during other navigations.
  return <ViewTransition name={`sleeve-${era.id}`} share="auto" default="none">{href === null ? <div className={className}>{face}</div> : (
    <Link href={href ?? eraHref(era.id)} className={cn("group block outline-offset-4", className)} aria-label={`Open ${era.name}, ${eraSpan(era)}`}><Tilt>{face}</Tilt></Link>
  )}</ViewTransition>;
}
