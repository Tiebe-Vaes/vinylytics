import { describe, expect, it } from "vitest";
import { cardOptions, DENSITIES, presetFields } from "./card-options";
import { INKS } from "./ink";

describe("share card settings", () => {
  it("starts with the era's ink, its dates, lead and artwork", () => {
    expect(cardOptions(new URLSearchParams(), "era", "orange")).toEqual({
      format: "post", ink: "orange", density: "balanced", fields: ["period", "lead", "cover"],
    });
  });

  it("has five distinct era presets and keeps every explicit change, including no optional facts", () => {
    expect(new Set(DENSITIES.map((d) => presetFields("era", d).join(","))).size).toBe(5);
    expect(cardOptions(new URLSearchParams("density=maximal&fields=period,rows"), "era", "plum").fields).toEqual(["period", "rows"]);
    expect(cardOptions(new URLSearchParams("density=maximal&fields="), "era", "plum").fields).toEqual([]);
  });

  it.each(INKS)("allows $id on a story card", ({ id }) => {
    expect(cardOptions(new URLSearchParams({ ink: id, format: "story" }), "era", "green")).toMatchObject({ ink: id, format: "story" });
  });
});
