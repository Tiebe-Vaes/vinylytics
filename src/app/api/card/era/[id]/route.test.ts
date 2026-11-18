import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { addDaysKey } from "@/lib/time";
import sharp from "sharp";
import { VISUALS } from "@/lib/card-options";

const owner = vi.hoisted(() => ({ yes: true }));
vi.mock("@/lib/owner", () => ({ isOwner: vi.fn(async () => owner.yes) }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, revalidateTag: vi.fn() }));

const { GET } = await import("./route");
const call = (id: string, format = "post") =>
  GET(new Request(`http://app.test/api/card/era/${id}?format=${format}`), { params: Promise.resolve({ id }) });

describe("GET /api/card/era/[id]", () => {
  beforeAll(async () => {
    const d = await useTestDb();
    await resetDb();
    const rows = [];
    for (let i = 0; i < 4; i++) {
      for (let k = 0; k < 20; k++) {
        rows.push({
          playedAt: new Date(Date.parse(`${addDaysKey("2026-01-05", 7 * i)}T08:00:00Z`) + k * 300_000),
          msPlayed: 240_000, kind: "track", uri: `spotify:track:t${k % 6}`, trackName: `Track ${k % 6}`, artistName: "Mira Vale", source: "export",
        });
      }
    }
    await d.insert(schema.plays).values(rows);
  });
  beforeEach(() => {
    owner.yes = true;
  });

  it("renders a PNG for an era without a cover", async () => {
    const res = await call("2026-01-05");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(10_000);
  });

  it.each(VISUALS.flatMap((v) => [[v, "post"], [v, "story"]]))("draws the %s visual on a %s card", async (visual, format) => {
    // Satori aborts the stream mid-render on unsupported SVG, so decode the whole PNG.
    const png = sharp(Buffer.from(await (await call("2026-01-05", `${format}&visual=${visual}&density=maximal`)).arrayBuffer()));
    expect((await png.metadata()).format).toBe("png");
  });

  it.each([["post", 1350], ["story", 1920]])("exports %s at the advertised size and selected ink", async (format, height) => {
    const response = await call("2026-01-05", format + "&ink=mustard&density=maximal");
    const png = sharp(Buffer.from(await response.arrayBuffer()));
    expect(await png.metadata()).toMatchObject({ format: "png", width: 1080, height });
    const corner = await png.extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
    expect(corner.toString("hex")).toBe("d9a21b");
  });

  it("omits hidden facts consistently regardless of the preset", async () => {
    const bytes = async (query: string) => Buffer.from(await (await call("2026-01-05", "post&" + query)).arrayBuffer());
    const minimal = await bytes("density=minimal");
    expect(await bytes("density=maximal&fields=cover")).toEqual(minimal);
    expect((await bytes("density=maximal&fields=period,stat,rows")).equals(minimal)).toBe(false);
  });

  it("404s for an unknown era", async () => {
    expect((await call("1999-01-04")).status).toBe(404);
  });

  it("refuses a visitor who isn't the owner", async () => {
    owner.yes = false;
    expect((await call("2026-01-05")).status).toBe(404);
  });

  it("serves a visitor once the public page shows eras, and stops when it's off", async () => {
    owner.yes = false;
    const d = await useTestDb();
    await d.insert(schema.settings).values({ publicEnabled: true, publicSections: { eras: true, top: false, insights: false, nowPlaying: false } });
    expect((await call("2026-01-05")).status).toBe(200);
    await d.update(schema.settings).set({ publicEnabled: false });
    expect((await call("2026-01-05")).status).toBe(404);
    await d.delete(schema.settings);
  });

  it("404s a malformed era id without looking it up", async () => {
    expect((await call("not-a-date")).status).toBe(404);
    expect((await call("2026-01-05x")).status).toBe(404);
  });
});
