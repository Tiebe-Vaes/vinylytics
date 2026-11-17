import { describe, expect, it } from "vitest";
import { appUrl } from "./app-url";

describe("appUrl", () => {
  it("builds redirects on the origin Spotify calls back to", () => {
    expect(appUrl("/login?error=failed", "http://127.0.0.1:3000/api/auth/callback", "http://localhost:3000/x").href).toBe(
      "http://127.0.0.1:3000/login?error=failed"
    );
  });
  it("falls back to the request URL when the redirect URI is missing or invalid", () => {
    expect(appUrl("/", undefined, "https://app.example/api/auth/login").href).toBe("https://app.example/");
    expect(appUrl("/", "not a url", "https://app.example/api/auth/login").href).toBe("https://app.example/");
  });
});
