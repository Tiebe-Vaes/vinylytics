import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session";

const now = new Date("2026-11-17T12:00:00Z");
const DAY = 86_400_000;

describe("session cookie", () => {
  const t = signSession("a", now, "s");

  it("round-trips the user id", () => {
    expect(verifySession(t, now, "s")).toBe("a");
  });
  it("is still valid after 29 days", () => {
    expect(verifySession(t, new Date(now.getTime() + 29 * DAY), "s")).toBe("a");
  });
  it("expires after 30 days", () => {
    expect(verifySession(t, new Date(now.getTime() + 31 * DAY), "s")).toBeNull();
  });
  it("rejects another secret", () => {
    expect(verifySession(t, now, "other")).toBeNull();
  });
  it("rejects a tampered signature", () => {
    expect(verifySession(t.slice(0, -2) + (t.endsWith("xx") ? "yy" : "xx"), now, "s")).toBeNull();
  });
  it("rejects a tampered payload", () => {
    const [, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "b", exp: now.getTime() + DAY })).toString("base64url");
    expect(verifySession(`${forged}.${sig}`, now, "s")).toBeNull();
  });
  it("returns null for garbage and missing tokens", () => {
    expect(verifySession("garbage", now, "s")).toBeNull();
    expect(verifySession("a.b.c", now, "s")).toBeNull();
    expect(verifySession(undefined, now, "s")).toBeNull();
    expect(verifySession("", now, "s")).toBeNull();
  });
  it("refuses to sign or verify with an empty secret", () => {
    expect(() => signSession("a", now, "")).toThrow();
    expect(verifySession(t, now, "")).toBeNull();
  });
});
