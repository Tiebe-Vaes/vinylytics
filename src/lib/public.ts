import { desc, eq } from "drizzle-orm";
import { db, hasDb, schema } from "@/db";
import { chartRange } from "@/lib/spotify/data";
import { topItems, type ChartItem } from "@/lib/spotify/charts";
import { getEras, type EraView } from "@/lib/spotify/eras-data";
import { getInsights, type Insights } from "@/lib/spotify/insights";

export type PublicSections = { eras: boolean; top: boolean; insights: boolean; nowPlaying: boolean };
export const DEFAULT_SECTIONS: PublicSections = { eras: true, top: true, insights: false, nowPlaying: false };

export async function getPublicSettings(): Promise<{ enabled: boolean; sections: PublicSections }> {
  if (!hasDb()) return { enabled: false, sections: DEFAULT_SECTIONS };
  const [row] = await db().select().from(schema.settings).where(eq(schema.settings.id, "owner")).limit(1);
  return { enabled: row?.publicEnabled ?? false, sections: { ...DEFAULT_SECTIONS, ...row?.publicSections } };
}

/** True when a visitor may see this section (the public page is on and the section is ticked). */
export async function publicAllows(section: keyof PublicSections): Promise<boolean> {
  const s = await getPublicSettings();
  return s.enabled && s.sections[section];
}

export type PublicPayload = {
  sections: PublicSections;
  eras?: EraView[];
  top?: { artists: ChartItem[]; tracks: ChartItem[] };
  insights?: Pick<Insights, "bSides" | "artistStreaks" | "albumCompletion">;
  lastSpin?: { name: string | null; artist: string | null; playedAt: string } | null;
};

/**
 * Everything the public page may show, built field by field from read-only
 * queries: never from the auth row, never the history log. Null when off.
 */
export async function publicPayload(): Promise<PublicPayload | null> {
  const { enabled, sections } = await getPublicSettings();
  if (!enabled) return null;
  const out: PublicPayload = { sections };
  const window = chartRange("4w");

  await Promise.all([
    sections.eras && getEras().then((e) => (out.eras = e.eras)),
    sections.top &&
      Promise.all([
        topItems({ kind: "artist", from: window?.from ?? null, to: window?.to ?? null, sort: "time", limit: 10 }),
        topItems({ kind: "track", from: window?.from ?? null, to: window?.to ?? null, sort: "time", limit: 10 }),
      ]).then(([artists, tracks]) => (out.top = { artists, tracks })),
    sections.insights &&
      getInsights().then((i) => (out.insights = { bSides: i.bSides, artistStreaks: i.artistStreaks, albumCompletion: i.albumCompletion })),
    sections.nowPlaying &&
      db()
        .select({ name: schema.plays.trackName, artist: schema.plays.artistName, playedAt: schema.plays.playedAt })
        .from(schema.plays)
        .where(eq(schema.plays.kind, "track"))
        .orderBy(desc(schema.plays.playedAt))
        .limit(1)
        .then(([p]) => (out.lastSpin = p ? { name: p.name, artist: p.artist, playedAt: p.playedAt.toISOString() } : null)),
  ]);
  return out;
}
