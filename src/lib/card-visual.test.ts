import { describe, expect, it } from "vitest";
import { shade, shape } from "./card-visual";

describe("card visual data", () => {
  it("averages a long series into buckets scaled to 0-1", () => {
    expect(shape([1, 3, 2, 2, 8, 0], 3)).toEqual([0.5, 0.5, 1]);
  });

  it("keeps short series as they are and never divides by zero", () => {
    expect(shape([5, 10], 30)).toEqual([0.5, 1]);
    expect(shape([0, 0, 0], 3)).toEqual([0, 0, 0]);
  });

  it("draws a gentle curve when there is no data", () => {
    const curve = shape([], 5);
    expect(curve).toHaveLength(5);
    expect(Math.max(...curve)).toBe(1);
  });

  it("darkens a colour toward black", () => {
    expect(shade("#ffffff", 0.5)).toBe("#808080");
  });
});
