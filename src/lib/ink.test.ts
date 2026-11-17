import { describe, expect, it } from "vitest";
import { contrast, hashInk, INKS, inkHex, inkText, nearestInk } from "./ink";

describe("inks", () => {
  it("every ink has text that reaches AA contrast on it", () => {
    for (const ink of INKS) expect(contrast(ink.hex, inkText(ink.hex))).toBeGreaterThanOrEqual(4.5);
  });

  it("snaps a cover colour to the nearest ink by hue", () => {
    expect(nearestInk([30, 80, 220])).toBe("cobalt");
    expect(nearestInk([220, 60, 40])).toBe("vermilion");
    expect(nearestInk([20, 140, 90])).toBe("green");
  });

  it("returns null for greyish colours so the caller can fall back", () => {
    expect(nearestInk([128, 128, 128])).toBeNull();
    expect(nearestInk([20, 20, 22])).toBeNull();
  });

  it("hashes a seed to a stable ink", () => {
    expect(hashInk("Saint Juniper")).toBe(hashInk("Saint Juniper"));
    expect(INKS.map((i) => i.id)).toContain(hashInk("anything"));
    expect(inkHex(hashInk("x"))).toMatch(/^#[0-9a-f]{6}$/);
  });
});
