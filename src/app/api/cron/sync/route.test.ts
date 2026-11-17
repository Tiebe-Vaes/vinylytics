import { beforeEach, describe, expect, it, vi } from "vitest";

const sync = vi.hoisted(() => vi.fn(async () => ({ seen: 3, written: 2 })));

vi.mock("@/lib/owner", () => ({ isOwner: vi.fn(async () => false) }));
vi.mock("@/lib/spotify/sync", async (orig) => ({
  ...(await orig<typeof import("@/lib/spotify/sync")>()),
  syncRecentlyPlayed: sync,
}));
vi.mock("@/lib/spotify/write", () => ({ logRun: vi.fn(async () => {}) }));
vi.mock("@/lib/spotify/enrich", () => ({ enrichMissing: vi.fn(async () => ({ tracks: 0, artists: 0 })) }));
const after = vi.hoisted(() => vi.fn());
const warm = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/spotify/warm", () => ({ warmCaches: warm }));

const { POST } = await import("./route");

const call = (auth?: string) =>
  POST(new Request("http://app.test/api/cron/sync", { method: "POST", headers: auth ? { authorization: auth } : {} }));

describe("POST /api/cron/sync", () => {
  beforeEach(() => {
    sync.mockClear();
    process.env.CRON_SECRET = "right";
    process.env.DATABASE_URL = "postgres://unused";
  });

  it("refuses a call with no bearer and no session", async () => {
    expect((await call()).status).toBe(401);
    expect(sync).not.toHaveBeenCalled();
  });

  it("refuses a wrong bearer", async () => {
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(sync).not.toHaveBeenCalled();
  });

  it("syncs once with the right bearer", async () => {
    const res = await call("Bearer right");
    expect(res.status).toBe(200);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("warms the slow cached views after responding", async () => {
    after.mockClear();
    warm.mockClear();
    await call("Bearer right");
    expect(warm).not.toHaveBeenCalled(); // not before the response
    await after.mock.calls[0][0]();
    expect(warm).toHaveBeenCalledTimes(1);
  });
});
