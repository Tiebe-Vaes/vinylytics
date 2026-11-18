import { expect, it, vi } from "vitest";
const db = vi.hoisted(() => vi.fn(() => { throw new Error("no database"); }));
vi.mock("@/db", () => ({ hasDb: () => false, db }));

it("returns empty highlights without connecting when no database is configured", async () => {
  const { getInsights } = await import("./insights");
  expect(await getInsights()).toEqual({albumCompletion: [], artistStreaks: []});
  expect(db).not.toHaveBeenCalled();
});
