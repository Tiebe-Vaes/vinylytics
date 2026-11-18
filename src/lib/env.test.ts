import { afterEach, describe, expect, it, vi } from "vitest";
import { isLoopbackHost, localOnly, timezone } from "./env";

describe("timezone", () => {
  const saved = process.env.TIMEZONE;
  afterEach(() => {
    if (saved === undefined) delete process.env.TIMEZONE;
    else process.env.TIMEZONE = saved;
  });

  it("defaults to UTC", () => {
    delete process.env.TIMEZONE;
    expect(timezone()).toBe("UTC");
  });

  it("treats an empty value as unset", () => {
    process.env.TIMEZONE = "";
    expect(timezone()).toBe("UTC");
  });

  it("accepts an IANA name", () => {
    process.env.TIMEZONE = "Europe/Brussels";
    expect(timezone()).toBe("Europe/Brussels");
  });

  it("names the variable when invalid", () => {
    process.env.TIMEZONE = "Europe/Brussel";
    expect(() => timezone()).toThrow(/TIMEZONE/);
  });
});

describe("isLoopbackHost", () => {
  it("trusts only this machine's addresses, with or without a port", () => {
    for (const host of ["127.0.0.1:3000", "localhost", "localhost:3000", "[::1]:3000"]) expect(isLoopbackHost(host)).toBe(true);
    for (const host of [null, "", "192.168.1.5:3000", "evil.example", "localhost.evil.example:3000", "127.0.0.1.nip.io"]) expect(isLoopbackHost(host)).toBe(false);
  });
});

describe("localOnly", () => {
  it("never turns sign-in off in production", () => {
    vi.stubEnv("VINYLYTICS_LOCAL", "1");
    vi.stubEnv("NODE_ENV", "development");
    expect(localOnly()).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(localOnly()).toBe(false);
    vi.unstubAllEnvs();
  });
});
