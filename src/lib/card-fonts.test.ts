import { expect, it, vi } from "vitest";

const readFile = vi.hoisted(() => vi.fn());
vi.mock("node:fs/promises", () => ({ readFile }));

it("retries font loading after a transient file read failure", async () => {
  const { cardFonts } = await import("./card");
  readFile.mockRejectedValueOnce(new Error("temporary read failure")).mockResolvedValue(Buffer.alloc(2048));
  await expect(cardFonts()).rejects.toThrow("temporary read failure");
  expect(await cardFonts()).toHaveLength(3);
  expect(readFile).toHaveBeenCalledTimes(6);
});
