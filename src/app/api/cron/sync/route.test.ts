import { beforeEach, describe, expect, it, vi } from "vitest";

const sync = vi.hoisted(() => vi.fn(async () => ({ seen: 3, written: 2 })));

vi.mock("@/lib/owner", () => ({ isOwner: vi.fn(async () => false) }));
vi.mock("@/lib/spotify/sync", async (orig) => ({
  ...(await orig<typeof import("@/lib/spotify/sync")>()),
  syncRecentlyPlayed: sync,
}));
vi.mock("@/lib/spotify/write", () => ({ logRun: vi.fn(async () => {}) }));
vi.mock("@/lib/spotify/enrich", () => ({ enrichMissing: vi.fn(async () => ({ tracks: 0, artists: 0 })) }));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

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
});
