import { expect, it } from "vitest";
import { pushRecent } from "./ink-picker";

it("moves a re-picked ink to the front without duplicating it", () => {
  expect(pushRecent(["cobalt", "teal"], "teal")).toEqual(["teal", "cobalt"]);
});

it("keeps at most five recent inks, newest first", () => {
  expect(pushRecent(["cobalt", "teal", "plum", "green", "orange"], "mustard")).toEqual(["mustard", "cobalt", "teal", "plum", "green"]);
});
