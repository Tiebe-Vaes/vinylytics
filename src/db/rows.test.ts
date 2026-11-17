import { describe, expect, it } from "vitest";
import { rowsOf } from "./rows";

describe("rowsOf", () => {
  it("reads postgres.js results, which are arrays", () => {
    expect([...rowsOf<{ a: number }>(Object.assign([{ a: 1 }], { count: 1 }))]).toEqual([{ a: 1 }]);
  });
  it("reads PGlite results, which wrap rows", () => {
    expect(rowsOf<{ a: number }>({ rows: [{ a: 2 }] })).toEqual([{ a: 2 }]);
  });
});
