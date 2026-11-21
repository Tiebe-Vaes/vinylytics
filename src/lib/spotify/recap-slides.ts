import type { InkId } from "@/lib/ink";
import type { CardVisual, CardField } from "@/lib/card-options";
import type { CardContent } from "@/lib/card-layout";
import type { loadRecap } from "./recap";
import type { RecapExtras } from "./recap-extras";
import { vinylPhysics } from "./recap-stats/vinyl";

/**
 * One recap stat as a card. The recap deck draws it in the page and the share
 * route draws the same card as a PNG. `count`, when set, is the headline number.
 */
export type Slide = {
  id: string; kicker: string; headline: string; detail?: string; ink: InkId; count?: number;
  visual: CardVisual; badge?: string; caption?: string; rows?: { label: string; value?: string }[];
};
type Recap = Pick<Awaited<ReturnType<typeof loadRecap>>, "minutes" | "artist" | "track" | "peakHour" | "longestStreak" | "activeDays">;
type Extras = Partial<Pick<RecapExtras,
  "obsessed" | "owl" | "season" | "mood" | "crush" | "race" | "grid" | "best" | "topArtists" | "burned" | "wonders" | "weather" | "repeat">> | null;

const n = (v: number) => Math.round(v).toLocaleString("en-GB");
const hh = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
const day = (key: string) => new Date(`${key.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const month = (key: string) => new Date(`${key.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).slice(0, 3);

/** Every recap stat that exists for the year, in deck order. */
export function recapSlides(recap: Recap, x: Extras): Slide[] {
  const v = vinylPhysics(recap.minutes);
  const out: (Slide | null | false | undefined)[] = [
    { id: "minutes", kicker: "This year you listened for", headline: `${n(recap.minutes)} minutes`, count: Math.round(recap.minutes), detail: `That's ${n(recap.minutes / 1440)} full days.`, ink: "cobalt", visual: "dots" },
    recap.artist && { id: "artist", kicker: "Your most played artist", headline: recap.artist.name, ink: "redviolet", visual: "label", badge: "#1", caption: "MOST PLAYED" },
    recap.track && { id: "song", kicker: "Your song of the year", headline: recap.track.name, detail: recap.track.subtitle, ink: "vermilion", visual: "turntable" },
    x?.topArtists && x.topArtists.length > 1 && { id: "top-artists", kicker: "Your top artists", headline: "On heavy rotation", ink: "orange", visual: "stack",
      rows: x.topArtists.slice(0, 5).map((a) => ({ label: a.name, value: `${n(a.minutes)} min` })) },
    recap.peakHour != null && { id: "peak", kicker: "Your peak hour", headline: `${hh(recap.peakHour)}–${hh(recap.peakHour + 1)}`, detail: "When the music played most.", ink: "mustard", visual: "grooves" },
    recap.longestStreak > 1 && { id: "streak", kicker: "Longest streak", headline: `${n(recap.longestStreak)} days`, detail: `In a row with music · ${n(recap.activeDays)} days in total.`, ink: "green", visual: "dots" },
    x?.obsessed && { id: "obsession", kicker: `On ${day(x.obsessed.day)} you played one song`, headline: `${x.obsessed.plays} times`, detail: `${x.obsessed.track} · ${x.obsessed.artist}`, ink: "plum", visual: "sticker", badge: `×${x.obsessed.plays}`, caption: "IN ONE DAY" },
    x?.owl && { id: "owl", kicker: "You are a", headline: x.owl.persona, detail: `${Math.round(x.owl.share * 100)}% of your minutes came after midnight.`, ink: x.owl.persona === "Night owl" ? "plum" : "orange", visual: "grooves" },
    x?.season && (x.season.summer || x.season.winter) && { id: "seasons", kicker: "Summer you vs winter you", headline: `${x.season.summer?.artist ?? "—"} / ${x.season.winter?.artist ?? "—"}`, ink: "orange", visual: "stack" },
    x?.mood && (x.mood.restless || x.mood.comfort || x.mood.spiral || x.mood.euphoric) && (() => {
      const [label, m] = ([["Most restless day", x.mood.restless], ["Comfort day", x.mood.comfort], ["Late-night spiral", x.mood.spiral], ["Euphoric day", x.mood.euphoric]] as const).find(([, mood]) => mood)!;
      return { id: "mood", kicker: label, headline: day(m!.day), detail: m!.detail, ink: "teal" as const, visual: "waveform" as const };
    })(),
    x?.crush?.fastest && { id: "crush", kicker: "Fastest crush", headline: x.crush.fastest.track, detail: `20 plays in ${x.crush.fastest.days} ${x.crush.fastest.days === 1 ? "day" : "days"}.`, ink: "redviolet", visual: "sticker", badge: "20×", caption: `IN ${x.crush.fastest.days} ${x.crush.fastest.days === 1 ? "DAY" : "DAYS"}` },
    x?.race && x.race.length > 1 && { id: "race", kicker: "Monthly number ones", headline: `${new Set(x.race.map((r) => r.artist)).size} artists led a month`, ink: "mustard", visual: "stack",
      rows: x.race.slice(-5).map((r) => ({ label: month(r.month), value: r.artist })) },
    recap.minutes > 0 && { id: "vinyl", kicker: "On a turntable that's", headline: `${n(v.rotations)} turns`, detail: `${v.grooveKm.toFixed(1)} km of groove.`, ink: "green", visual: "turntable" },
    x?.grid?.some((row) => row.some((m) => m > 0)) && { id: "fingerprint", kicker: "Your listening fingerprint", headline: "Yours alone", detail: "Rings are weekdays, spokes are hours.", ink: "cobalt", visual: "grooves" },
    x?.weather && (x.weather.rainy || x.weather.sunny) && { id: "weather", kicker: `Weather you · ${x.weather.city}`, headline: `${x.weather.rainy?.artist ?? "—"} / ${x.weather.sunny?.artist ?? "—"}`, detail: "Rainy days / sunny days.", ink: "teal", visual: "waveform" },
    x?.burned && x.burned.length > 0 && { id: "burnout", kicker: "Burnout", headline: "Played to death", ink: "vermilion", visual: "waveform",
      rows: x.burned.slice(0, 5).map((b) => ({ label: b.track, value: `${b.peakPlays}× in ${month(b.peakMonth)}` })) },
    x?.wonders && x.wonders.length > 0 && { id: "wonders", kicker: "One-week wonders", headline: "Here, then gone", ink: "teal", visual: "dots",
      rows: x.wonders.slice(0, 5).map((w) => ({ label: w.artist, value: `week of ${day(w.week)}` })) },
    x?.best?.artist && { id: "goat", kicker: "All-time favourite", headline: x.best.artist.name, detail: `${n(x.best.artist.minutes / 60)} hours, ever.`, ink: "mustard", visual: "label", badge: "GOAT", caption: "ALL TIME" },
  ];
  return out.filter((s): s is Slide => Boolean(s));
}

/** The share card for one slide. `cover` is the year's top artist image, used by the label visuals. */
export function slideCard(slide: Slide, year: number, cover: string | null | undefined): CardContent {
  return {
    kind: "recap", ink: slide.ink, edition: `${year}  /  RECAP`, title: slide.headline, period: String(year),
    lead: slide.kicker, cover: cover ?? null, stat: slide.detail, rows: slide.rows, visual: slide.visual,
    badge: slide.badge ?? String(year), caption: slide.caption ?? "MY YEAR",
  };
}

/** The facts a slide card shows before anyone customises it: the kicker, the detail, and its list when it has one. */
export function slideFields(slide: Slide): CardField[] {
  return slide.rows?.length ? ["lead", "rows"] : ["lead", "stat"];
}

/** Share link for one slide, with its own visual and facts so the composer opens on what the deck shows. */
export function slideHref(slide: Slide, year: number): string {
  return `/api/card/recap?${new URLSearchParams({ year: String(year), slide: slide.id, visual: slide.visual, fields: slideFields(slide).join(",") })}`;
}
