import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { RecapExtras } from "@/lib/spotify/recap-extras";
import { Bento, CARD_TITLES } from "./bento";

const recap = {
  days: [], minutes: 10656, plays: 3602, activeDays: 322, peakHour: 10, longestStreak: 22, repeatShare: 40,
  artist: { id: "a", name: "Saint Juniper", subtitle: "", plays: 1, ms: 1, imageUrl: null, href: "/artist/Saint%20Juniper" },
  track: { id: "t", name: "Slow Motion Summer", subtitle: "Saint Juniper", plays: 1, ms: 72_000_000, imageUrl: null, href: "/track/t" },
};
const top = { artist: "Saint Juniper", track: "Slow Motion Summer", minutes: 900 };
const day = (detail: string) => ({ day: "2026-04-01", value: 1, detail });
const extras: RecapExtras = {
  owl: { share: 0.2, persona: "Night owl" }, season: { summer: top, winter: top }, session: { start: "2026-05-01T21:00", minutes: 214, plays: 51 },
  obsessed: { track: "Undertow", artist: "Mira Vale", day: "2026-02-14", plays: 14 }, repeat: { track: "Undertow", artist: "Mira Vale", run: 9, day: "2026-02-14" },
  burned: [], wonders: [], best: { artist: { name: "Saint Juniper", minutes: 9000 }, track: { uri: "spotify:track:t", name: "Slow Motion Summer", artist: "Saint Juniper", minutes: 1200 } },
  race: [{ month: "2026-01", artist: "Mira Vale", minutes: 300 }, { month: "2026-02", artist: "Saint Juniper", minutes: 320 }],
  crush: { fastest: { track: "Glass Houses", artist: "Ada Wren", days: 3 }, slowBurner: null, ghosted: [{ artist: "Cold Harbour", lastPlay: "2026-03-01", minutesBefore: 400 }] },
  mood: { restless: day("38% of plays skipped"), comfort: day("82% old favourites"), spiral: null, euphoric: day("12 new songs · 3 h 10 min") },
  grid: Array.from({ length: 7 }, () => Array<number>(24).fill(1)),
  weather: { city: "Ghent, Belgium", rainyDays: 40, rainy: top, sunny: top },
  topArtists: [{ key: "Saint Juniper", name: "Saint Juniper", subtitle: "", cover: null, minutes: 900, streams: 200, href: "/artist/Saint%20Juniper" }],
};
const html = (x: RecapExtras | null) => renderToStaticMarkup(<Bento year={2026} recap={recap} extras={x} />);
const count = (s: string, title: string) => s.split(`>${title}</h3>`).length - 1;
/** Cards built from the base recap alone, shown even without the extra stats. */
const BASE = ["minutes", "peak", "streak", "song", "vinyl"];

it("shows only the minutes when there is nothing else to say", () => {
  const out = html(null);
  expect(out).toContain(CARD_TITLES.minutes);
  for (const [key, title] of Object.entries(CARD_TITLES)) if (!BASE.includes(key)) expect(count(out, title), title).toBe(0);
});

it("gives every stat its own card, each title once", () => {
  const out = html(extras);
  for (const [key, title] of Object.entries(CARD_TITLES)) {
    if (key === "burnout" || key === "wonders") continue; // empty lists hide their card
    expect(count(out, title), title).toBe(1);
  }
});
