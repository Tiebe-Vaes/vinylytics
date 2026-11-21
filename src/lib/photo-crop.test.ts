import { describe, expect, it } from "vitest";
import { dragFocus, photoRect } from "./photo-crop";

describe("photo background placement", () => {
  it("covers the card at zoom 1 and centres on the focus point", () => {
    // A 2000 × 1000 landscape photo on a 1080 × 1350 card: scaled to the card's height.
    expect(photoRect(2000, 1000, 1080, 1350, 0.5, 0.5, 1)).toEqual({ dx: -810, dy: 0, dw: 2700, dh: 1350 });
  });

  it("puts the left edge on the card at focus 0 and the right edge at focus 1", () => {
    expect(photoRect(2000, 1000, 1080, 1350, 0, 0.5, 1).dx).toBe(0);
    expect(photoRect(2000, 1000, 1080, 1350, 1, 0.5, 1).dx).toBe(-1620);
  });

  it("zooms around the focus point and never leaves a gap", () => {
    const r = photoRect(1000, 1000, 1080, 1350, 0.5, 0.5, 2);
    expect(r).toEqual({ dx: -810, dy: -675, dw: 2700, dh: 2700 });
  });

  it("drags the photo with the pointer: moving right shows more of the left side", () => {
    // Preview 270 px wide for a 1080 card: 1 preview px = 4 card px; 1620 px of slack.
    expect(dragFocus(0.5, 81, 270, 1080, 2700)).toBeCloseTo(0.3);
    expect(dragFocus(0.1, 500, 270, 1080, 2700)).toBe(0);
    expect(dragFocus(0.5, 50, 270, 1080, 1080)).toBe(0.5);
  });
});
