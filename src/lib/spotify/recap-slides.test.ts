import { expect, it } from "vitest";
import { recapSlides, slideCard, slideHref } from "./recap-slides";

const recap = {
  minutes: 10656, peakHour: 10, longestStreak: 322, activeDays: 322,
  artist: { id: "a", name: "Saint Juniper", subtitle: "", plays: 1, ms: 1, imageUrl: null, href: "/artist/a" },
  track: { id: "t", name: "Slow Motion Summer", subtitle: "Saint Juniper", plays: 1, ms: 1, imageUrl: null, href: "/track/t" },
};

it("gives the minutes slide a number to count up to, matching its headline", () => {
  const [first] = recapSlides(recap, null);
  expect(first.count).toBe(10656);
  expect(first.headline).toBe("10,656 minutes");
});

it("tells only what it knows: minutes, artist and song when extras are missing", () => {
  expect(recapSlides(recap, null).map((s) => s.id)).toEqual(["minutes", "artist", "song", "peak", "streak", "vinyl"]);
});

it("keeps a fixed order with unique ids when every stat is there", () => {
  const top = { artist: "A", track: "B", minutes: 9 };
  const day = { day: "2026-04-01", value: 1, detail: "x" };
  const slides = recapSlides(recap, {
    obsessed: { track: "U", artist: "M", day: "2026-02-14", plays: 14 }, owl: { share: 0.2, persona: "Night owl" },
    season: { summer: top, winter: top }, mood: { restless: day, comfort: null, spiral: null, euphoric: null },
    crush: { fastest: { track: "G", artist: "W", days: 3 }, slowBurner: null, ghosted: [] },
    race: [{ month: "2026-01", artist: "M", minutes: 1 }, { month: "2026-02", artist: "S", minutes: 2 }],
    grid: [[1]], best: { artist: { name: "S", minutes: 600 }, track: null },
  });
  expect(slides.map((s) => s.id)).toEqual(["minutes", "artist", "song", "peak", "streak", "obsession", "owl", "seasons", "mood", "crush", "race", "vinyl", "fingerprint", "goat"]);
  expect(new Set(slides.map((s) => s.id)).size).toBe(slides.length);
});

it("turns a list stat into a card that opens on its list, with its own visual", () => {
  const [, , , top] = recapSlides(recap, { topArtists: [
    { key: "a", name: "Saint Juniper", minutes: 3537 }, { key: "b", name: "Low Orbit Club", minutes: 2936 },
  ] as never });
  expect(top.id).toBe("top-artists");
  expect(top.rows).toEqual([{ label: "Saint Juniper", value: "3,537 min" }, { label: "Low Orbit Club", value: "2,936 min" }]);
  expect(slideHref(top, 2026)).toBe("/api/card/recap?year=2026&slide=top-artists&visual=stack&fields=lead%2Crows");
  expect(slideCard(top, 2026, null)).toMatchObject({ kind: "recap", title: "On heavy rotation", visual: "stack", lead: "Your top artists" });
});

it("tells how taste moved since last year, as a list card", () => {
  const taste = recapSlides(recap, { shift: { newCount: 12, topNew: "Fresh Find", comeback: null, dropped: ["Old Flame", "Gone Band"] } }).find((s) => s.id === "taste")!;
  expect(taste.headline).toBe("12 new artists");
  expect(taste.rows).toEqual([{ label: "Biggest find", value: "Fresh Find" }, { label: "Dropped", value: "Old Flame, Gone Band" }]);
  expect(recapSlides(recap, { shift: { newCount: 0, topNew: null, comeback: null, dropped: [] } }).some((s) => s.id === "taste")).toBe(false);
});
