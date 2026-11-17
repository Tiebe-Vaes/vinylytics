import { beforeEach, describe, expect, it, vi } from "vitest";

const sync = vi.hoisted(() => vi.fn(async () => ({ seen: 3, written: 2 })));

vi.mock("@/lib/owner", () => ({ isOwner: vi.fn(async () => false) }));
vi.mock("@/lib/spotify/sync", async (orig) => ({
  ...(await orig<typeof import("@/lib/spotify/sync")>()),
  syncRecentlyPlayed: sync,
}));
vi.mock("@/lib/spotify/write", () => ({ logRun: vi.fn(async () => {}) }));
const enrich = vi.hoisted(() => vi.fn(async () => ({ tracks: 0, artists: 0, albums: 0 })));
vi.mock("@/lib/spotify/enrich", () => ({ enrichMissing: enrich }));
const after = vi.hoisted(() => vi.fn());
const warm = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after }));
const revalidate = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidateTag: revalidate }));
vi.mock("@/lib/spotify/warm", () => ({ warmCaches: warm }));

const { POST } = await import("./route");

const call = (auth?: string) =>
  POST(new Request("http://app.test/api/cron/sync", { method: "POST", headers: auth ? { authorization: auth } : {} }));

describe("POST /api/cron/sync", () => {
  beforeEach(() => {
    sync.mockClear();
    enrich.mockResolvedValue({ tracks: 0, artists: 0, albums: 0 });
    revalidate.mockClear();
    after.mockClear();
    process.env.CRON_SECRET = "right";
    process.env.DATABASE_URL = "postgres://unused";
  });

  it("invalidates the charts and insights after an album-only backfill", async () => {
    enrich.mockResolvedValueOnce({ tracks: 0, artists: 0, albums: 1 });
    await call("Bearer right");
    await after.mock.calls[0][0]();
    expect(revalidate).toHaveBeenCalledWith("spotify", { expire: 0 });
    expect(revalidate).toHaveBeenCalledWith("insights", { expire: 0 });
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
