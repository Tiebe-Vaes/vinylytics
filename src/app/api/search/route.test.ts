import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";

const owner = vi.hoisted(() => ({ yes: true }));
vi.mock("@/lib/owner", () => ({ isOwner: vi.fn(async () => owner.yes) }));
const { GET } = await import("./route");
const call = (q: string) => GET(new Request(`http://app.test/api/search?q=${encodeURIComponent(q)}`));

let d: Awaited<ReturnType<typeof useTestDb>>;
beforeAll(async () => { d = await useTestDb(); });
beforeEach(async () => {
  owner.yes = true;
  await resetDb();
  await d.insert(schema.plays).values(Array.from({ length: 8 }, (_, i) => ({
    playedAt: new Date(Date.UTC(2026, 0, 1 + i)), msPlayed: 200_000, kind: "track",
    uri: `spotify:track:j${i}`, trackName: `Juniper ${i}`, artistName: i === 0 ? "Saint Juniper" : `Other ${i}`, source: "export",
  })));
});

it("groups the owner's matches by kind, at most four each, with links", async () => {
  const res = await call("juniper");
  expect(res.status).toBe(200);
  const groups = await res.json() as { kind: string; items: { name: string; href: string }[] }[];
  expect(groups.map((g) => g.kind)).toEqual(["artist", "track"]);
  expect(groups[1].items).toHaveLength(4);
  expect(groups[0].items[0]).toMatchObject({ name: "Saint Juniper", href: "/artist/Saint%20Juniper" });
});

it("answers nothing to visitors or to an empty query", async () => {
  expect((await (await call(" ")).json())).toEqual([]);
  owner.yes = false;
  expect((await call("juniper")).status).toBe(404);
});
