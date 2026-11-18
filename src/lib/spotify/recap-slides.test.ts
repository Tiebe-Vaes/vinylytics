import { expect, it } from "vitest";
import { recapSlides } from "./recap-slides";

const recap = {
  minutes: 10656, peakHour: 10,
  artist: { id: "a", name: "Saint Juniper", subtitle: "", plays: 1, ms: 1, imageUrl: null, href: "/artist/a" },
  track: { id: "t", name: "Slow Motion Summer", subtitle: "Saint Juniper", plays: 1, ms: 1, imageUrl: null, href: "/track/t" },
};

it("tells only what it knows: minutes, artist and song when extras are missing", () => {
  expect(recapSlides(recap, null).map((s) => s.id)).toEqual(["minutes", "artist", "song", "vinyl"]);
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
  expect(slides.map((s) => s.id)).toEqual(["minutes", "artist", "song", "obsession", "owl", "seasons", "mood", "crush", "race", "vinyl", "fingerprint", "goat"]);
  expect(new Set(slides.map((s) => s.id)).size).toBe(slides.length);
});
