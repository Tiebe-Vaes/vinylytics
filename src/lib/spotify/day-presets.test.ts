import { expect, it } from "vitest";
import { dayPresets } from "./day-presets";

it("offers today, yesterday, a week ago and a year ago as local date keys", () => {
  expect(dayPresets("2026-03-01")).toEqual([
    { label: "Today", day: "2026-03-01" },
    { label: "Yesterday", day: "2026-02-28" },
    { label: "A week ago", day: "2026-02-22" },
    { label: "A year ago", day: "2025-03-01" },
  ]);
});

it("lands a year back from a leap day on 28 February", () => {
  expect(dayPresets("2024-02-29").at(-1)).toEqual({ label: "A year ago", day: "2023-02-28" });
});
