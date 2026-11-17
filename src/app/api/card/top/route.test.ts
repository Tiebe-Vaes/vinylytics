import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";

const owner = vi.hoisted(() => ({ yes: true }));
vi.mock("@/lib/owner", () => ({ isOwner: vi.fn(async () => owner.yes) }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, revalidateTag: vi.fn() }));

const { GET } = await import("./route");
const call = (qs: string) => GET(new Request(`http://app.test/api/card/top?${qs}`));

describe("GET /api/card/top", () => {
  let d: Awaited<ReturnType<typeof useTestDb>>;
  beforeAll(async () => {
    d = await useTestDb();
    await resetDb();
    // Only old plays: nothing in the last 4 weeks, plenty all-time.
    await d.insert(schema.plays).values(
      Array.from({ length: 12 }, (_, i) => ({
        playedAt: new Date(Date.UTC(2025, 0, 1 + i, 12)), msPlayed: 200_000, kind: "track",
        uri: `spotify:track:t${i % 3}`, trackName: `T${i % 3}`, artistName: "Old Flame", source: "export",
      }))
    );
  });
  beforeEach(async () => {
    owner.yes = true;
    await d.delete(schema.settings);
  });

  it("lets the owner share any range", async () => {
    expect((await call("kind=artist&range=all")).status).toBe(200);
  });

  it("404s an anonymous visitor while the public top lists are off", async () => {
    owner.yes = false;
    expect((await call("kind=artist&range=4w")).status).toBe(404);
  });

  it("only gives visitors what the public page shows: the last 4 weeks", async () => {
    owner.yes = false;
    await d.insert(schema.settings).values({ publicEnabled: true, publicSections: { eras: false, top: true, insights: false, nowPlaying: false } });
    // All-time has data, 4 weeks has none: a visitor asking for all-time still gets the 4-week card (empty, so 404).
    expect((await call("kind=artist&range=all")).status).toBe(404);
  });
});
