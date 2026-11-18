import { describe, expect, it } from "vitest";
import { computeStreaks, genreMinutes, rankByMonth } from "./stats";

describe("computeStreaks", () => {
  it("is zero with no plays", () => {
    expect(computeStreaks([], "2026-10-17")).toEqual({ current: 0, longest: 0 });
  });
  it("counts a run ending today", () => {
    expect(computeStreaks(["2026-10-15", "2026-10-16", "2026-10-17"], "2026-10-17")).toEqual({ current: 3, longest: 3 });
  });
  it("keeps the streak alive when today has no play yet", () => {
    expect(computeStreaks(["2026-10-15", "2026-10-16"], "2026-10-17").current).toBe(2);
  });
  it("breaks on a missed day", () => {
    expect(computeStreaks(["2026-10-14", "2026-10-16"], "2026-10-17")).toEqual({ current: 1, longest: 1 });
  });
  it("does not break across the October DST change", () => {
    expect(computeStreaks(["2026-10-24", "2026-10-25", "2026-10-26"], "2026-10-26").current).toBe(3);
  });
  it("ignores order and duplicates", () => {
    const messy = ["2026-10-16", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-01"];
    expect(computeStreaks(messy, "2026-10-17")).toEqual(
      computeStreaks(["2026-10-01", "2026-10-15", "2026-10-16", "2026-10-17"], "2026-10-17")
    );
    expect(computeStreaks(messy, "2026-10-17")).toEqual({ current: 3, longest: 3 });
  });
  it("finds a longer streak in the past", () => {
    expect(computeStreaks(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-10-17"], "2026-10-17")).toEqual({ current: 1, longest: 4 });
  });
});


describe("rankByMonth", () => {
  const rows = [
    { month: "2026-01", artist: "A", minutes: 100 },
    { month: "2026-01", artist: "B", minutes: 50 },
    { month: "2026-01", artist: "C", minutes: 10 },
    { month: "2026-02", artist: "A", minutes: 20 },
    { month: "2026-02", artist: "B", minutes: 90 },
  ];

  it("ranks the top artists per month, null when absent", () => {
    const r = rankByMonth(rows);
    expect(r.months).toEqual(["2026-01", "2026-02"]);
    expect(r.artists).toEqual(["B", "A", "C"]);
    expect(r.ranks.A).toEqual([1, 2]);
    expect(r.ranks.B).toEqual([2, 1]);
    expect(r.ranks.C).toEqual([3, null]);
  });
  it("keeps only the top N by total minutes", () => {
    expect(rankByMonth(rows, 2).artists).toEqual(["B", "A"]);
  });
  it("breaks ties by name", () => {
    const tie = rankByMonth([
      { month: "2026-01", artist: "Zed", minutes: 10 },
      { month: "2026-01", artist: "Abe", minutes: 10 },
    ]);
    expect(tie.ranks.Abe).toEqual([1]);
    expect(tie.ranks.Zed).toEqual([2]);
  });
  it("is empty with no rows", () => {
    expect(rankByMonth([])).toEqual({ months: [], artists: [], ranks: {} });
  });
});

describe("genreMinutes", () => {
  it("splits an artist's minutes evenly across its tags", () => {
    const g = genreMinutes(
      [
        { name: "X", minutes: 60 },
        { name: "Y", minutes: 10 },
      ],
      new Map([["X", ["rock", "indie"]]])
    );
    expect(g).toEqual([
      { genre: "rock", minutes: 30 },
      { genre: "indie", minutes: 30 },
      { genre: "other", minutes: 10 },
    ]);
  });
  it("is empty with no artists", () => {
    expect(genreMinutes([], new Map())).toEqual([]);
  });
  it("folds everything past the top 10 into other", () => {
    const artists = Array.from({ length: 12 }, (_, i) => ({ name: `a${i}`, minutes: 100 - i }));
    const tags = new Map(artists.map((a, i) => [a.name, [`g${i}`]]));
    const g = genreMinutes(artists, tags);
    expect(g).toHaveLength(11);
    expect(g[10]).toEqual({ genre: "other", minutes: 90 + 89 });
  });
});
