import { expect, it } from "vitest";
import { chartSentence } from "./chart-sentence";

it("reads a preset range as a sentence", () => {
  expect(chartSentence({ kind: "artist", range: "4w", sort: "time" })).toBe("Top artists of the last 4 weeks by minutes");
  expect(chartSentence({ kind: "album", range: "all", sort: "time" })).toBe("Top albums of all time by minutes");
});

it("reads custom dates in local day form", () => {
  expect(chartSentence({ kind: "track", range: "custom", sort: "plays", from: "2026-03-01", to: "2026-04-30" }))
    .toBe("Top songs from 1 Mar to 30 Apr 2026 by plays");
  expect(chartSentence({ kind: "track", range: "custom", sort: "plays", from: "2025-12-20", to: "2026-01-05" }))
    .toBe("Top songs from 20 Dec 2025 to 5 Jan 2026 by plays");
});
