import { describe, expect, it } from "vitest";
import { CLASSIC_INKS, classicOf, contrast, hashInk, INKS, inkHex, inkName, inkText, nearestInk } from "./ink";

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

describe("inks", () => {
  it("has at least 64 inks with unique ids, the eight classics first and unchanged", () => {
    expect(INKS.length).toBeGreaterThanOrEqual(64);
    expect(new Set(INKS.map((i) => i.id)).size).toBe(INKS.length);
    expect(INKS.slice(0, 8).map(({ id, hex }) => ({ id, hex }))).toEqual([
      { id: "cobalt", hex: "#1f4fd8" }, { id: "vermilion", hex: "#bf3a22" }, { id: "mustard", hex: "#d9a21b" }, { id: "green", hex: "#127450" },
      { id: "plum", hex: "#6e3a8c" }, { id: "teal", hex: "#0b6b78" }, { id: "orange", hex: "#e0701f" }, { id: "redviolet", hex: "#b0306a" },
    ]);
    expect(CLASSIC_INKS).toEqual(INKS.slice(0, 8));
  });

  it("every ink has text that reaches AA contrast on it", () => {
    for (const ink of INKS) expect(contrast(ink.hex, inkText(ink.hex))).toBeGreaterThanOrEqual(4.5);
  });

  it("names every ink for people", () => {
    expect(inkName("redviolet")).toBe("Red-violet");
    expect(inkName("cobalt")).toBe("Cobalt");
    for (const ink of INKS) expect(inkName(ink.id)).toMatch(/^[A-Z][a-z -]+$/);
  });

  it("snaps a cover colour to the closest of all inks", () => {
    expect(nearestInk([31, 79, 216])).toBe("cobalt");
    for (const ink of INKS) expect(nearestInk(rgb(ink.hex)) ?? ink.id).toBe(ink.id);
  });

  it("returns null for greyish colours so the caller can fall back", () => {
    expect(nearestInk([128, 128, 128])).toBeNull();
    expect(nearestInk([20, 20, 22])).toBeNull();
  });

  it("maps every ink to a classic for paired accent colours", () => {
    for (const ink of INKS) expect(CLASSIC_INKS.map((c) => c.id)).toContain(classicOf(ink.id));
    expect(classicOf("teal")).toBe("teal");
  });

  it("hashes a seed to a stable classic ink, unchanged by the bigger palette", () => {
    expect(hashInk("Saint Juniper")).toBe("redviolet");
    expect(hashInk("Mira Vale")).toBe("orange");
    expect(inkHex(hashInk("x"))).toMatch(/^#[0-9a-f]{6}$/);
  });
});
