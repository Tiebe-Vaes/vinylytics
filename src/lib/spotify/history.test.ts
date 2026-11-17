import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { historyPage } from "./history";

let d: Awaited<ReturnType<typeof useTestDb>>;

describe("historyPage", () => {
  beforeAll(async () => {
    d = await useTestDb();
  });
  beforeEach(async () => {
    await resetDb();
    await d.insert(schema.plays).values(
      Array.from({ length: 5 }, (_, i) => ({
        playedAt: new Date(Date.UTC(2026, 2, 1, 10, i)),
        msPlayed: i === 2 ? 5_000 : 180_000,
        kind: "track",
        uri: `spotify:track:t${i}`,
        trackName: `Track ${i}`,
        artistName: "A",
        skipped: i === 2,
        source: "export",
      }))
    );
  });

  it("lists plays newest first", async () => {
    const page = await historyPage(null, 3);
    expect(page.plays.map((p) => p.name)).toEqual(["Track 4", "Track 3", "Track 2"]);
    expect(page.plays[2].skipped).toBe(true);
  });

  it("pages on with the cursor and stops at the end", async () => {
    const first = await historyPage(null, 3);
    expect(first.next).not.toBeNull();
    const second = await historyPage(first.next, 3);
    expect(second.plays.map((p) => p.name)).toEqual(["Track 1", "Track 0"]);
    expect(second.next).toBeNull();
  });

  it("rejects a malformed cursor by starting from the top", async () => {
    expect((await historyPage("not-a-date", 3)).plays[0].name).toBe("Track 4");
  });
});
