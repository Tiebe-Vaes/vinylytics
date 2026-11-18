import { expect, it } from "vitest";
import { orderMonths } from "./monthly-ranks";

const months = [
  { month: "2026-01", minutes: 50, streams: 9 },
  { month: "2026-02", minutes: 80, streams: 3 },
  { month: "2026-03", minutes: 50, streams: 4 },
];
const keys = (rows: typeof months) => rows.map((m) => m.month);

it("orders by the measure the view shows, newest first on ties, and limits", () => {
  expect(keys(orderMonths(months, "most", 0, (m) => m.minutes))).toEqual(["2026-02", "2026-03", "2026-01"]);
  expect(keys(orderMonths(months, "most", 0, (m) => m.streams))).toEqual(["2026-01", "2026-03", "2026-02"]);
  expect(keys(orderMonths(months, "recent", 2, (m) => m.minutes))).toEqual(["2026-03", "2026-02"]);
  expect(keys(orderMonths(months, "oldest", 0, (m) => m.minutes))).toEqual(["2026-01", "2026-02", "2026-03"]);
});
