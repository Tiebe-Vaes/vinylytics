import { describe, expect, it } from "vitest";
import { decideOwner } from "./owner";

describe("decideOwner", () => {
  it("lets the first account claim a fresh copy", () => {
    expect(decideOwner({ envOwner: null, storedOwner: null, incoming: "a" })).toBe("claim");
  });
  it("lets the stored owner back in", () => {
    expect(decideOwner({ envOwner: null, storedOwner: "a", incoming: "a" })).toBe("allow");
  });
  it("refuses anyone else once claimed", () => {
    expect(decideOwner({ envOwner: null, storedOwner: "a", incoming: "b" })).toBe("deny");
  });
  it("lets the pinned owner claim", () => {
    expect(decideOwner({ envOwner: "a", storedOwner: null, incoming: "a" })).toBe("claim");
  });
  it("refuses a stranger even on a fresh copy when the owner is pinned", () => {
    expect(decideOwner({ envOwner: "a", storedOwner: null, incoming: "b" })).toBe("deny");
  });
  it("lets the env pin win over a stored owner", () => {
    expect(decideOwner({ envOwner: "a", storedOwner: "b", incoming: "b" })).toBe("deny");
    expect(decideOwner({ envOwner: "a", storedOwner: "b", incoming: "a" })).toBe("claim");
  });
});
