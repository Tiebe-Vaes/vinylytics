import { afterEach, describe, expect, it } from "vitest";
import { timezone } from "./env";

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
