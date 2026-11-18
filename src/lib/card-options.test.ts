import { describe, expect, it } from "vitest";
import { cardOptions, DENSITIES, presetFields } from "./card-options";
import { INKS } from "./ink";

describe("share card settings", () => {
  it("starts minimal: the era's ink and its artwork, every fact opt-in", () => {
    expect(cardOptions(new URLSearchParams(), "era", "orange")).toEqual({
      visual: "sleeve", format: "post", ink: "orange", density: "minimal", fields: ["cover"],
    });
    expect(presetFields("era", "minimal")).toEqual(["cover"]);
    expect(presetFields("top", "maximal")).toEqual(["cover", "period", "lead", "stat", "rows"]);
  });

  it("picks a visual per card kind and only accepts known visuals", () => {
    expect(cardOptions(new URLSearchParams(), "recap", "cobalt").visual).toBe("dots");
    expect(cardOptions(new URLSearchParams("visual=waveform"), "era", "cobalt").visual).toBe("waveform");
    expect(cardOptions(new URLSearchParams("visual=<svg>"), "top", "cobalt").visual).toBe("stack");
  });

  it("has five distinct era presets and keeps every explicit change, including no optional facts", () => {
    expect(new Set(DENSITIES.map((d) => presetFields("era", d).join(","))).size).toBe(5);
    expect(cardOptions(new URLSearchParams("density=maximal&fields=period,rows"), "era", "plum").fields).toEqual(["period", "rows"]);
    expect(cardOptions(new URLSearchParams("density=maximal&fields="), "era", "plum").fields).toEqual([]);
  });

  it("uses the cover mosaic for a chart shared from grid view unless a visual was picked", () => {
    expect(cardOptions(new URLSearchParams("view=grid"), "top", "cobalt").visual).toBe("mosaic");
    expect(cardOptions(new URLSearchParams("view=grid&visual=stack"), "top", "cobalt").visual).toBe("stack");
    expect(cardOptions(new URLSearchParams("view=list"), "top", "cobalt").visual).toBe("stack");
  });

  it.each(INKS)("allows $id on a story card", ({ id }) => {
    expect(cardOptions(new URLSearchParams({ ink: id, format: "story" }), "era", "green")).toMatchObject({ ink: id, format: "story" });
  });
});
