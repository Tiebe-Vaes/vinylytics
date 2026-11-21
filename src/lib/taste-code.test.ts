import { expect, it } from "vitest";
import { compareTaste, decodeTaste, encodeTaste } from "./taste-code";

it("round-trips a year and its artists, accents included, through a URL-safe code", () => {
  const code = encodeTaste(2026, ["Saint Juniper", "Mira Vale", "Björk"]);
  expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(decodeTaste(code)).toEqual({ year: 2026, artists: ["Saint Juniper", "Mira Vale", "Björk"] });
});

it("rejects codes that are not ours, and caps what a code can carry", () => {
  expect(decodeTaste("not-a-code")).toBeNull();
  expect(decodeTaste(encodeTaste(1999, ["A"]))).toBeNull();
  expect(decodeTaste(Buffer.from(JSON.stringify({ v: 1, y: 2026, a: [1, 2] })).toString("base64url"))).toBeNull();
  const many = encodeTaste(2026, Array.from({ length: 40 }, (_, i) => `Artist ${i}`));
  expect(decodeTaste(many)?.artists).toHaveLength(15);
});

it("scores the overlap against the longer list and splits who has what", () => {
  const result = compareTaste(["Saint Juniper", "Mira Vale", "Ada Wren", "Neon Atlas"], ["mira vale", "Ada Wren", "Cold Harbour"]);
  expect(result).toEqual({ match: 50, shared: ["Mira Vale", "Ada Wren"], onlyMine: ["Saint Juniper", "Neon Atlas"], onlyTheirs: ["Cold Harbour"] });
  expect(compareTaste([], []).match).toBe(0);
});
