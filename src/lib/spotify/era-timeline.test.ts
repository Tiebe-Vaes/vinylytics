import { expect, it } from "vitest";
import { timelineSegments } from "./era-timeline";

const e = (id: string, start: string, end: string) => ({ id, start, end, ink: "cobalt" as const, name: id });

it("places eras as fractions of the window, side by side on one lane", () => {
  const segs = timelineSegments([e("a", "2026-01-01", "2026-01-31"), e("b", "2026-02-01", "2026-03-02")], "2026-01-01", "2026-03-02");
  expect(segs.map((s) => s.lane)).toEqual([0, 0]);
  expect(segs[0].left).toBe(0);
  expect(segs[1].left + segs[1].width).toBeCloseTo(1, 5);
});

it("moves an overlapping era to the next lane", () => {
  const segs = timelineSegments([e("a", "2026-01-01", "2026-02-15"), e("b", "2026-02-01", "2026-03-01")], "2026-01-01", "2026-03-01");
  expect(segs.map((s) => s.lane)).toEqual([0, 1]);
});

it("clips eras to the window and drops ones outside it", () => {
  const segs = timelineSegments([e("old", "2024-01-01", "2024-02-01"), e("edge", "2025-12-01", "2026-01-31")], "2026-01-01", "2026-03-01");
  expect(segs.map((s) => s.id)).toEqual(["edge"]);
  expect(segs[0].left).toBe(0);
});

it("returns nothing for no eras", () => {
  expect(timelineSegments([], "2026-01-01", "2026-03-01")).toEqual([]);
});
