import Link from "next/link";
import { ViewTransition } from "react";
import { Cover } from "@/components/sleeve/cover";
import { inkHex, inkText } from "@/lib/ink";
import type { EraView } from "@/lib/spotify/eras-data";
import { cn } from "@/lib/utils";

const monthYear = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

export const eraSpan = (era: Pick<EraView, "start" | "end">) => `${monthYear(era.start)} – ${monthYear(era.end)}`;
export const eraHours = (era: Pick<EraView, "minutes">) => Math.round(era.minutes / 60);

/**
 * A record sleeve: one flat ink, the era's name stacked in condensed capitals,
 * the hours as the big figure, and the lead cover as a sticker. On the shelf
 * it links to its era page and morphs into the page's sleeve on the way.
 */
export function Sleeve({
  era,
  size = "shelf",
  href,
  className,
}: {
  era: EraView;
  size?: "shelf" | "hero";
  /** Defaults to the era page; pass null to render a sleeve that isn't a link. */
  href?: string | null;
  className?: string;
}) {
  const bg = inkHex(era.ink);
  const fg = inkText(bg);
  const hero = size === "hero";
  const face = (
    <div
      className={cn("relative flex aspect-square w-full flex-col justify-between overflow-hidden rounded-[2px]", hero ? "p-6 md:p-8" : "p-4")}
      style={{ background: bg, color: fg }}
    >
      <div className="flex items-start justify-between gap-3 text-xs font-semibold">
        <span>{eraSpan(era)}</span>
        <span className="nums">{era.weeks} wk</span>
      </div>
      <div className="min-w-0">
        <div className={cn("display", hero ? "text-[clamp(56px,16vw,120px)]" : "text-[56px]")}>
          {eraHours(era)}
          <span className={cn("ml-1 align-top", hero ? "text-[0.35em]" : "text-[0.4em]")}>h</span>
        </div>
        <h2 className={cn("display mt-2 line-clamp-3", hero ? "text-[clamp(36px,9vw,72px)]" : "text-[32px]")}>{era.name}</h2>
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="min-w-0 truncate text-xs font-semibold">{era.artists.map((a) => a.name).join(" · ")}</span>
        <Cover url={era.cover} size={hero ? 72 : 44} alt={`Cover from ${era.name}`} />
      </div>
    </div>
  );

  const link = href === null ? null : (href ?? `/eras/${era.id}`);
  const body = link ? (
    <Link href={link} className={cn("block outline-offset-4", className)} aria-label={`${era.name}, ${eraSpan(era)}`}>
      {face}
    </Link>
  ) : (
    <div className={className}>{face}</div>
  );
  return <ViewTransition name={`sleeve-${era.id}`}>{body}</ViewTransition>;
}
