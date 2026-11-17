import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const insert = vi.hoisted(() => vi.fn());
const stored = vi.hoisted(() => ({ owner: null as string | null }));

vi.mock("@/db", async (orig) => ({
  ...(await orig<typeof import("@/db")>()),
  hasDb: () => true,
  db: () => ({ insert: (...a: unknown[]) => (insert(...a), { values: () => ({ onConflictDoUpdate: async () => {} }) }) }),
}));
vi.mock("@/lib/owner", async (orig) => ({
  ...(await orig<typeof import("@/lib/owner")>()),
  storedOwner: async () => stored.owner,
}));
vi.mock("@/lib/spotify/auth", () => ({
  exchangeCode: async () => ({ access_token: "at", refresh_token: "rt", expires_in: 3600, scope: "s" }),
}));

const { GET } = await import("./route");

function callback(incoming: string) {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id: incoming })));
  const req = new NextRequest("http://127.0.0.1:3000/api/auth/callback?code=c&state=st", {
    headers: { cookie: `spotify_oauth=${encodeURIComponent(JSON.stringify({ verifier: "v".repeat(43), state: "st" }))}` },
  });
  return GET(req);
}

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    insert.mockClear();
    stored.owner = null;
    delete process.env.OWNER_SPOTIFY_ID;
    process.env.AUTH_SECRET = "secret";
    process.env.SPOTIFY_REDIRECT_URI = "http://127.0.0.1:3000/api/auth/callback";
  });

  it("refuses a stranger once the copy is claimed, writing no tokens and no session", async () => {
    stored.owner = "tiebe";
    const res = await callback("stranger");
    expect(res.headers.get("location")).toBe("http://127.0.0.1:3000/login?error=not-owner");
    expect(insert).not.toHaveBeenCalled();
    expect(res.cookies.get("session")?.value ?? "").toBe("");
  });

  it("refuses a stranger on a fresh copy when OWNER_SPOTIFY_ID pins someone else", async () => {
    process.env.OWNER_SPOTIFY_ID = "tiebe";
    const res = await callback("stranger");
    expect(res.headers.get("location")).toBe("http://127.0.0.1:3000/login?error=not-owner");
    expect(insert).not.toHaveBeenCalled();
  });

  it("lets the first account claim a fresh copy and signs it in", async () => {
    const res = await callback("tiebe");
    expect(res.headers.get("location")).toBe("http://127.0.0.1:3000/");
    expect(insert).toHaveBeenCalledTimes(1);
    expect(res.cookies.get("session")?.value).toMatch(/\./);
    expect(res.cookies.get("session")?.secure).toBeFalsy();
  });
});
