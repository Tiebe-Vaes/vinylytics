import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const get = (url: string) => GET(new NextRequest(url, { headers: { host: new URL(url).host } }));

describe("GET /api/auth/login", () => {
  beforeEach(() => {
    process.env.SPOTIFY_CLIENT_ID = "id";
    process.env.SPOTIFY_REDIRECT_URI = "http://127.0.0.1:3000/api/auth/callback";
  });

  it("moves a localhost visit to the redirect-URI host first, so the OAuth cookie survives the callback", async () => {
    const res = await get("http://localhost:3000/api/auth/login");
    expect(res.headers.get("location")).toBe("http://127.0.0.1:3000/api/auth/login");
    expect(res.cookies.get("spotify_oauth")).toBeUndefined();
  });

  it("starts OAuth on the right host with a non-Secure cookie over http", async () => {
    const res = await get("http://127.0.0.1:3000/api/auth/login");
    expect(res.headers.get("location")).toMatch(/^https:\/\/accounts\.spotify\.com\/authorize\?/);
    expect(res.cookies.get("spotify_oauth")?.secure).toBeFalsy();
  });

  it("marks the cookie Secure when the app runs on https", async () => {
    process.env.SPOTIFY_REDIRECT_URI = "https://app.example/api/auth/callback";
    const res = await get("https://app.example/api/auth/login");
    expect(res.cookies.get("spotify_oauth")?.secure).toBe(true);
  });
});
