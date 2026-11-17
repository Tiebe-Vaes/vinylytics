import { describe, expect, it } from "vitest";
import { roastEmpty, roastEra, roastItem, roastWeek } from "./roast";

describe("roastWeek", () => {
  it("calls out a one-artist week by name, with the exact share", () => {
    const line = roastWeek({ minutes: 600, plays: 180, topArtist: "Mira Vale", topArtistShare: 0.64 });
    expect(line).toContain("Mira Vale");
    expect(line).toContain("64%");
  });

  it("has a line for a quiet week", () => {
    const line = roastWeek({ minutes: 0, plays: 0, topArtist: null, topArtistShare: 0 });
    expect(line.length).toBeGreaterThan(10);
    expect(line).not.toContain("null");
  });

  it("keeps exact numbers and is stable for the same input", () => {
    const input = { minutes: 1234, plays: 300, topArtist: "A", topArtistShare: 0.2 };
    expect(roastWeek(input)).toBe(roastWeek(input));
    expect(roastWeek(input)).toMatch(/1,234|20\.6 hours|21 hours/);
  });

  it("keeps a long artist name intact", () => {
    const name = "The Extremely Long Name Orchestra And Friends Of The Late Night Radio";
    expect(roastWeek({ minutes: 500, plays: 100, topArtist: name, topArtistShare: 0.7 })).toContain(name);
  });
});

describe("roastEra", () => {
  it("names the lead and the exact hours", () => {
    const line = roastEra({ id: "2026-01-05", lead: "Low Orbit Club", minutes: 5760, weeks: 25, name: "Low Orbit Club era" });
    expect(line).toContain("Low Orbit Club");
    expect(line).toContain("96");
  });
});

describe("roastItem", () => {
  it("roasts a binge with the exact count", () => {
    const line = roastItem({ name: "Undertow", streams: 412, peakWeekMinutes: 300, weeksPlayed: 3 });
    expect(line).toContain("412");
  });
});

describe("roastEmpty", () => {
  it("has a line per page", () => {
    for (const page of ["shelf", "charts", "insights", "history"] as const) expect(roastEmpty(page).length).toBeGreaterThan(10);
  });
});
