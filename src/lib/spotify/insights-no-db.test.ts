import { expect, it, vi } from "vitest";

const db = vi.hoisted(() => vi.fn(() => { throw new Error("no database"); }));
vi.mock("@/db", () => ({ hasDb: () => false, db }));

it("returns empty insights without trying to connect when no database is configured", async () => {
  const { getInsights } = await import("./insights");
  expect(await getInsights("2026-11-17")).toEqual({
    bSides: [], reissues: [], newVsFamiliar: [], loyalty: { stayers: [], oneAndDone: [] },
    onThisDay: [], albumCompletion: [], artistStreaks: [],
  });
  expect(db).not.toHaveBeenCalled();
});
