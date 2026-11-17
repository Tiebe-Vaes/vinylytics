import { describe, expect, it } from "vitest";
import { addDaysKey } from "@/lib/time";
import { detectEras, type EraOverride, type WeekArtist } from "./eras";

const START = "2025-01-06"; // a Monday

/**
 * Compact history: [artist, weeks] runs, artist null = a quiet week with no
 * plays at all. Each active week gives the artist 120 min and "Filler" 20 min.
 */
function weeks(runs: [string | null, number][], from = START, minutes = 120): WeekArtist[] {
  const rows: WeekArtist[] = [];
  let week = from;
  for (const [artist, n] of runs) {
    for (let i = 0; i < n; i++) {
      if (artist) {
        rows.push({ week, artist, minutes });
        rows.push({ week, artist: "Filler", minutes: 20 });
      }
      week = addDaysKey(week, 7);
    }
  }
  return rows;
}
const weekAt = (i: number) => addDaysKey(START, 7 * i);

describe("detectEras", () => {
  it("three clear phases give three eras", () => {
    const { eras } = detectEras(weeks([["A", 10], ["B", 10], ["C", 10]]), []);
    expect(eras.map((e) => [e.lead, e.weeks])).toEqual([["A", 10], ["B", 10], ["C", 10]]);
    expect(eras[0].start).toBe(START);
    expect(eras[0].end).toBe(addDaysKey(weekAt(9), 6));
    expect(eras[1].id).toBe(weekAt(10));
  });

  it("a 2-week blip merges into its bigger neighbour", () => {
    const { eras } = detectEras(weeks([["A", 6], ["B", 2], ["A", 6]]), []);
    expect(eras).toHaveLength(1);
    expect(eras[0]).toMatchObject({ lead: "A", weeks: 14 });
  });

  it("quiet weeks inside an era are kept", () => {
    const { eras } = detectEras(weeks([["A", 5], [null, 2], ["A", 5]]), []);
    expect(eras).toHaveLength(1);
    expect(eras[0].weeks).toBe(10);
    expect(eras[0].end).toBe(addDaysKey(weekAt(11), 6));
  });

  it("splits eras at a silence of SILENCE_SPLIT_WEEKS quiet weeks", () => {
    const { eras } = detectEras(weeks([["A", 5], [null, 4], ["A", 5]]), []);
    expect(eras).toHaveLength(2);
    expect(eras[0].end).toBe(addDaysKey(weekAt(4), 6));
    expect(eras[1].start).toBe(weekAt(9));
  });

  it("one short history gives one era", () => {
    expect(detectEras([{ week: START, artist: "A", minutes: 60 }], []).eras).toHaveLength(1);
    expect(detectEras([{ week: START, artist: "A", minutes: 20 }], []).eras).toHaveLength(0);
    expect(detectEras([], []).eras).toHaveLength(0);
  });

  it("merge override joins two eras", () => {
    const merge: EraOverride = { id: "m1", kind: "merge", from: START, to: addDaysKey(weekAt(9), 6) };
    const { eras } = detectEras(weeks([["A", 5], ["B", 5]]), [merge]);
    expect(eras).toHaveLength(1);
    expect(eras[0].weeks).toBe(10);
  });

  it("rename applies to the era containing the anchor", () => {
    const rename: EraOverride = { id: "r1", kind: "rename", anchor: addDaysKey(weekAt(12), 3), name: "Summer of B" };
    const { eras } = detectEras(weeks([["A", 10], ["B", 10]]), [rename]);
    expect(eras[1]).toMatchObject({ name: "Summer of B", renamedBy: "r1" });
    expect(eras[0].renamedBy).toBeNull();
  });

  it("rename follows the era when history grows", () => {
    const rename: EraOverride = { id: "r1", kind: "rename", anchor: addDaysKey(weekAt(12), 3), name: "Summer of B" };
    const older = weeks([["C", 10]], addDaysKey(START, -70));
    const { eras } = detectEras([...older, ...weeks([["A", 10], ["B", 10]])], [rename]);
    expect(eras).toHaveLength(3);
    expect(eras.find((e) => e.lead === "B")?.name).toBe("Summer of B");
  });

  it("unused overrides are reported", () => {
    const lost: EraOverride = { id: "r2", kind: "rename", anchor: addDaysKey(weekAt(6), 2), name: "Silence" };
    const nowhere: EraOverride = { id: "m2", kind: "merge", from: "2010-01-01", to: "2010-02-01" };
    const { unusedOverrideIds } = detectEras(weeks([["A", 5], [null, 4], ["A", 5]]), [lost, nowhere]);
    expect(unusedOverrideIds.sort()).toEqual(["m2", "r2"]);
  });

  it("default name", () => {
    const { eras } = detectEras(weeks([["Mira Vale", 4]]), []);
    expect(eras[0].name).toBe("Mira Vale era");
    expect(eras[0].artists[0]).toEqual({ name: "Mira Vale", minutes: 480 });
    expect(eras[0].minutes).toBe(560);
  });
});
