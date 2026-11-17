import { expect, it, vi } from "vitest";

vi.mock("./eras-data", () => ({ getEras: vi.fn(async () => { throw new Error("db down"); }) }));
vi.mock("./insights", () => ({ cachedInsights: vi.fn(async () => ({})) }));

const { warmCaches } = await import("./warm");

it("never throws when one view fails to warm", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(warmCaches()).resolves.toBeUndefined();
  expect(log).toHaveBeenCalledWith("[warm-caches]", expect.any(Error));
});
