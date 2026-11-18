import Link from "next/link";
import type { ReactNode } from "react";
import { Tilt } from "@/components/motion/tilt";
import { inkHex, inkText, type InkId } from "@/lib/ink";
import type { loadRecap } from "@/lib/spotify/recap";
import type { RecapExtras } from "@/lib/spotify/recap-extras";
import { vinylPhysics } from "@/lib/spotify/recap-stats/vinyl";
import { cn } from "@/lib/utils";
import { Fingerprint } from "./fingerprint";

export const CARD_TITLES = {
  minutes: "Minutes of music", peak: "Peak hour", streak: "Longest streak", song: "Top song", obsession: "The obsession",
  topArtists: "Top artists", race: "Monthly number ones", mood: "Mood days", vinyl: "On the turntable", owl: "Night or day",
  seasons: "Summer vs winter", crush: "Crushes", ghosted: "Ghosted", goat: "All-time favourite", weather: "Weather you",
  fingerprint: "Your listening fingerprint", burnout: "Burnout", wonders: "One-week wonders",
} as const;

type Recap = Pick<Awaited<ReturnType<typeof loadRecap>>, "minutes" | "plays" | "activeDays" | "peakHour" | "longestStreak" | "artist" | "track">;
const n = (v: number) => Math.round(v).toLocaleString("en-GB");
const hh = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
const shortDate = (key: string) => new Date(`${key.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const monthShort = (key: string) => new Date(`${key}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });

/** A bento tile in an ink; `span` makes the hero tile 2×2. */
function Tile({ title, ink, span, className, children }: { title: string; ink?: InkId; span?: "hero" | "wide" | "tall"; className?: string; children: ReactNode }) {
  const bg = ink ? inkHex(ink) : undefined;
  return (
    <Tilt className={cn(span === "hero" && "sm:col-span-2 sm:row-span-2", span === "wide" && "sm:col-span-2", span === "tall" && "row-span-2")}>
      <section aria-label={title} className={cn("flex h-full min-h-44 flex-col gap-3 overflow-hidden p-5", !ink && "border border-rule bg-raised", className)}
        style={bg ? { background: bg, color: inkText(bg) } : undefined}>
        <h3 className="text-xs font-bold tracking-widest uppercase opacity-80">{title}</h3>
        {children}
      </section>
    </Tilt>
  );
}

function ClockDial({ hour }: { hour: number }) {
  const a = ((hour % 12) / 12) * 2 * Math.PI;
  return (
    <svg viewBox="0 0 100 100" className="size-24" aria-hidden="true">
      <circle cx={50} cy={50} r={46} fill="none" stroke="currentColor" strokeWidth={3} />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1={50} y1={8} x2={50} y2={i % 3 ? 13 : 17} stroke="currentColor" strokeWidth={2} transform={`rotate(${i * 30} 50 50)`} />)}
      <path d={`M50 50 L${50 + 40 * Math.sin(a)} ${50 - 40 * Math.cos(a)} A40 40 0 0 1 ${50 + 40 * Math.sin(a + Math.PI / 6)} ${50 - 40 * Math.cos(a + Math.PI / 6)} Z`} fill="currentColor" opacity={0.35} />
      <line x1={50} y1={50} x2={50 + 30 * Math.sin(a)} y2={50 - 30 * Math.cos(a)} stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
      <circle cx={50} cy={50} r={4} fill="currentColor" />
    </svg>
  );
}

export function Bento({ year, recap, extras }: { year: number; recap: Recap; extras: RecapExtras | null }) {
  const x = extras;
  const v = vinylPhysics(recap.minutes);
  const race = x?.race ?? [];
  const raceMax = Math.max(1, ...race.map((r) => r.minutes));
  return (
    <div className="grid grid-flow-dense auto-rows-[minmax(11rem,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile title={CARD_TITLES.minutes} ink="cobalt" span="hero">
        <p className="display text-[clamp(4rem,11vw,8rem)] leading-none">{n(recap.minutes)}</p>
        <p className="text-lg font-semibold">That&apos;s {n(recap.minutes / 1440)} full days of {year}.</p>
        {recap.artist && <Link href={recap.artist.href} className="link-underline mt-auto self-start font-semibold">Most played: {recap.artist.name}</Link>}
      </Tile>

      {recap.peakHour !== null && <Tile title={CARD_TITLES.peak} ink="mustard">
        <ClockDial hour={recap.peakHour} />
        <p className="display text-3xl">{hh(recap.peakHour)}–{hh(recap.peakHour + 1)}</p>
      </Tile>}

      {recap.longestStreak > 0 && <Tile title={CARD_TITLES.streak}>
        <div aria-hidden="true" className="flex flex-wrap gap-1">{Array.from({ length: Math.min(recap.longestStreak, 21) }, (_, i) => <span key={i} className="h-3 w-5 rounded-full border-2 border-current" />)}</div>
        <p className="display text-4xl">{recap.longestStreak} days</p>
        <p className="text-sm opacity-80">in a row with music · {n(recap.activeDays)} days in total</p>
      </Tile>}

      {recap.track && <Tile title={CARD_TITLES.song} ink="vermilion" className="[mask:radial-gradient(circle_at_0_50%,transparent_10px,#000_11px),radial-gradient(circle_at_100%_50%,transparent_10px,#000_11px)] [mask-composite:intersect]">
        <p className="text-xs font-semibold opacity-80">ADMIT ONE · {n(recap.track.ms / 60000)} MIN</p>
        <Link href={recap.track.href} className="display link-underline self-start text-3xl break-words">{recap.track.name}</Link>
        <p className="mt-auto border-t border-dashed border-current pt-2 text-sm">{recap.track.subtitle}</p>
      </Tile>}

      {x?.obsessed && <Tile title={CARD_TITLES.obsession} ink="redviolet">
        <p className="display text-5xl">×{x.obsessed.plays}</p>
        <p className="font-semibold break-words">{x.obsessed.track}</p>
        <p className="text-sm opacity-80">on {shortDate(x.obsessed.day)}{x.repeat ? ` · ${x.repeat.run} times back to back` : ""}</p>
      </Tile>}

      {x && x.topArtists.length > 0 && <Tile title={CARD_TITLES.topArtists} span="tall" className="bg-[#eeebe4]! font-mono text-[#0f0f10]">
        <p className="text-center text-xs">VINYLYTICS · {year} · RECEIPT</p>
        <ol className="grid gap-1 border-y border-dashed border-current py-2 text-sm">
          {x.topArtists.map((a, i) => <li key={a.key} className="flex justify-between gap-2"><span className="truncate">{i + 1} {a.name}</span><span>{n(a.minutes)}</span></li>)}
        </ol>
        <p className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{n(recap.minutes)} MIN</span></p>
        <p className="text-center text-xs">THANK YOU FOR LISTENING</p>
      </Tile>}

      {race.length > 1 && <Tile title={CARD_TITLES.race} span="wide">
        <ol className="grid gap-1.5">
          {race.map((r) => <li key={r.month} className="grid grid-cols-[2.5rem_1fr] items-center gap-2 text-xs">
            <span className="font-semibold">{monthShort(r.month)}</span>
            <span className="relative h-5 bg-ground"><span className="absolute inset-y-0 left-0 flex items-center bg-text px-1.5 font-semibold whitespace-nowrap text-ground" style={{ width: `${Math.max(18, (r.minutes / raceMax) * 100)}%` }}>{r.artist}</span></span>
          </li>)}
        </ol>
      </Tile>}

      {x && (x.mood.restless || x.mood.comfort || x.mood.spiral || x.mood.euphoric) && <Tile title={CARD_TITLES.mood} span="wide">
        <dl className="grid grid-cols-2 gap-3">
          {([["Restless", x.mood.restless, "vermilion"], ["Comfort", x.mood.comfort, "teal"], ["Late-night spiral", x.mood.spiral, "plum"], ["Euphoric", x.mood.euphoric, "mustard"]] as const)
            .filter(([, m]) => m).map(([label, m, ink]) => (
              <div key={label} className="p-3" style={{ background: inkHex(ink), color: inkText(inkHex(ink)) }}>
                <dt className="text-xs font-bold uppercase">{label}</dt>
                <dd className="font-semibold">{shortDate(m!.day)}</dd>
                <dd className="text-xs opacity-85">{m!.detail}</dd>
              </div>
            ))}
        </dl>
        <p className="text-xs opacity-70">Read from what you did (skips, replays, new songs), not from the music&apos;s mood.</p>
      </Tile>}

      {recap.minutes > 0 && <Tile title={CARD_TITLES.vinyl} ink="green">
        <p className="display text-4xl">{n(v.rotations)}</p><p className="text-sm">platter turns at 33⅓ rpm</p>
        <p className="font-semibold">{v.grooveKm.toFixed(1)} km of groove · {v.recordsWorn > 0 ? `${v.recordsWorn} records worn out` : "no record worn out yet"}</p>
      </Tile>}

      {x?.owl && <Tile title={CARD_TITLES.owl} ink={x.owl.persona === "Night owl" ? "plum" : x.owl.persona === "Early bird" ? "orange" : "teal"}>
        <p aria-hidden="true" className="text-5xl">{x.owl.persona === "Night owl" ? "☾" : x.owl.persona === "Early bird" ? "☀" : "◐"}</p>
        <p className="display text-3xl">{x.owl.persona}</p>
        <p className="text-sm opacity-85">{Math.round(x.owl.share * 100)}% of your minutes after midnight</p>
      </Tile>}

      {x?.season && (x.season.summer || x.season.winter) && <Tile title={CARD_TITLES.seasons} span="wide" className="p-0">
        <div className="grid flex-1 grid-cols-2">
          {([["Summer", x.season.summer, "orange"], ["Winter", x.season.winter, "cobalt"]] as const).map(([label, s, ink]) => (
            <div key={label} className="flex flex-col gap-1 p-4" style={{ background: inkHex(ink), color: inkText(inkHex(ink)) }}>
              <p className="text-xs font-bold uppercase">{label}</p>
              {s ? <><p className="display text-2xl break-words">{s.artist}</p><p className="text-sm">{s.track}</p><p className="mt-auto text-xs">{n(s.minutes)} min</p></> : <p className="text-sm">No listening</p>}
            </div>
          ))}
        </div>
      </Tile>}

      {x?.crush.fastest && <Tile title={CARD_TITLES.crush} ink="redviolet">
        <p aria-hidden="true" className="text-4xl">♥</p>
        <p className="font-semibold break-words">{x.crush.fastest.track} · {x.crush.fastest.artist}</p>
        <p className="text-sm opacity-85">20 plays in {x.crush.fastest.days} {x.crush.fastest.days === 1 ? "day" : "days"}</p>
        {x.crush.slowBurner && <p className="text-xs opacity-80">Slow burner: {x.crush.slowBurner.track} took {x.crush.slowBurner.days} days</p>}
      </Tile>}

      {x && x.crush.ghosted.length > 0 && <Tile title={CARD_TITLES.ghosted}>
        <ul className="grid gap-1">{x.crush.ghosted.map((g) => <li key={g.artist}><span className="font-semibold">{g.artist}</span> <span className="text-xs opacity-70">· last on {shortDate(g.lastPlay)}</span></li>)}</ul>
        <p className="mt-auto text-xs opacity-70">Hours together, then silence.</p>
      </Tile>}

      {x?.best.artist && <Tile title={CARD_TITLES.goat} ink="mustard">
        <p aria-hidden="true" className="text-4xl">🏆</p>
        <p className="display text-3xl break-words">{x.best.artist.name}</p>
        <p className="text-sm">{n(x.best.artist.minutes / 60)} hours, all time{x.best.track ? ` · ${x.best.track.name}` : ""}</p>
      </Tile>}

      {x?.weather && <Tile title={CARD_TITLES.weather} span="wide" className="p-0">
        <div className="grid flex-1 grid-cols-2">
          {([["Rainy days ☂", x.weather.rainy, "teal"], ["Sunny days ☀", x.weather.sunny, "mustard"]] as const).map(([label, s, ink]) => (
            <div key={label} className="flex flex-col gap-1 p-4" style={{ background: inkHex(ink), color: inkText(inkHex(ink)) }}>
              <p className="text-xs font-bold uppercase">{label}</p>
              {s ? <><p className="display text-2xl break-words">{s.artist}</p><p className="text-sm">{s.track}</p></> : <p className="text-sm">Not enough days yet</p>}
            </div>
          ))}
        </div>
        <p className="px-4 pb-3 text-xs opacity-70">{x.weather.city} · {x.weather.rainyDays} rainy listening days</p>
      </Tile>}

      {x?.grid.some((row) => row.some((m) => m > 0)) && <Tile title={CARD_TITLES.fingerprint} span="tall">
        <Fingerprint grid={x.grid} ink="cobalt" size={200} label={`Listening by weekday and hour in ${year}`} />
        <p className="text-xs opacity-70">Rings are weekdays (Monday outside), spokes are hours. Yours alone.</p>
      </Tile>}

      {x && x.burned.length > 0 && <Tile title={CARD_TITLES.burnout}>
        <ul className="grid gap-1 text-sm">{x.burned.map((b) => <li key={b.track}><span className="font-semibold">{b.track}</span> · {b.peakPlays}× in {monthShort(b.peakMonth)}, then {b.afterPlays}</li>)}</ul>
      </Tile>}

      {x && x.wonders.length > 0 && <Tile title={CARD_TITLES.wonders}>
        <ul className="grid gap-1 text-sm">{x.wonders.map((w) => <li key={w.artist}><span className="font-semibold">{w.artist}</span> · week of {shortDate(w.week)}</li>)}</ul>
      </Tile>}
    </div>
  );
}
