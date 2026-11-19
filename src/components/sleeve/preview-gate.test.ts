import { expect, it } from "vitest";
import { previewState } from "./preview-gate";

const rendered = { src: "/api/card/era/x?ink=cobalt", objectUrl: "blob:1", file: null, canShare: false };

it("offers the file only when it was rendered from the current options", () => {
  expect(previewState(rendered, "/api/card/era/x?ink=cobalt", null)).toEqual({ ready: rendered, stale: false, error: false });
});

it("keeps showing an old render as stale but never offers it while a new one is pending", () => {
  expect(previewState(rendered, "/api/card/era/x?ink=teal", null)).toEqual({ ready: null, stale: true, error: false });
});

it("reports an error only for the current options", () => {
  expect(previewState(null, "/a", "/a")).toEqual({ ready: null, stale: false, error: true });
  expect(previewState(rendered, "/b", "/a")).toEqual({ ready: null, stale: true, error: false });
});
