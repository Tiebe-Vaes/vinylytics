import { afterEach, expect, it } from "vitest";
import { register } from "./instrumentation";

afterEach(() => {
  delete process.env.TIMEZONE;
});

it("fails server start on an invalid TIMEZONE, naming the variable", () => {
  process.env.TIMEZONE = "Europe/Brussel";
  expect(() => register()).toThrow(/TIMEZONE/);
});

it("starts with a valid TIMEZONE", () => {
  process.env.TIMEZONE = "Europe/Brussels";
  expect(() => register()).not.toThrow();
});
