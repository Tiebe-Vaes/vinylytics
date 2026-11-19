import Link from "next/link";
import { Badge, Empty, PageHeader, Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/toaster";
import { getPublicSettings, type PublicSections } from "@/lib/public";
import { getSpotifyStatus } from "@/lib/spotify/client";
import { getEras } from "@/lib/spotify/eras-data";
import { clock, localDateKey } from "@/lib/time";
import { deleteOverride } from "../eras/actions";
import { saveWeatherCity, savePublicSettings, syncNow } from "./actions";
import { eq } from "drizzle-orm";
import { db, hasDb, schema } from "@/db";

export const dynamic = "force-dynamic";

const LABEL = { connected: "Connected", broken: "Needs a reconnect", "not-connected": "Not connected" } as const;
const SECTIONS: { key: keyof PublicSections; label: string }[] = [
  { key: "eras", label: "Shelf of eras" },
  { key: "top", label: "Top artists and songs, 4 weeks" },
  { key: "insights", label: "Artist streaks" },
  { key: "nowPlaying", label: "Last song played" },
];
const monthYear = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const dayLabel = (d: Date) =>
  new Date(`${localDateKey(d)}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function SettingsPage() {
  const [spotify, pub, { overrides }, weather] = await Promise.all([
    getSpotifyStatus().catch(() => ({ state: "not-connected" as const, lastSyncAt: null })),
    getPublicSettings(),
    getEras(),
    hasDb() ? db().select({ city: schema.settings.weatherCity }).from(schema.settings).where(eq(schema.settings.id, "owner")).then((r) => r[0]?.city ?? null) : null,
  ]);

  return (
    <div className="flex flex-col gap-12">
      <PageHeader title="Settings" />

      <Panel title="Spotify" subtitle={LABEL[spotify.state] + (spotify.lastSyncAt ? ` · last sync ${dayLabel(spotify.lastSyncAt)}, ${clock(spotify.lastSyncAt)}` : "")}>
        <div className="flex flex-wrap gap-2">
          {spotify.state === "connected" ? (
            <ActionForm action={syncNow} success="Synced with Spotify">
              <Button size="sm" type="submit">Sync now</Button>
            </ActionForm>
          ) : (
            <Button size="sm" render={<a href="/api/auth/login" />} nativeButton={false}>Reconnect</Button>
          )}
          <Button size="sm" variant="outline" render={<Link href="/settings/import" />} nativeButton={false}>Import history</Button>
        </div>
        <p className="mt-3 text-sm text-muted-text">
          Artwork fills in during sync. Each run processes a limited number of items and retries older gaps.
          Items without artwork on Spotify keep a placeholder and are checked again every six hours.
        </p>
      </Panel>

      <Panel title="Public page" subtitle="A read-only page at /u for friends. Off until you switch it on; your history log is never shown.">
        <ActionForm action={savePublicSettings} success="Settings saved" className="flex flex-col gap-3">
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" name="enabled" defaultChecked={pub.enabled} className="size-4 accent-[var(--text)]" />
            Show my public page
          </label>
          <fieldset className="ml-7 flex flex-col gap-2 text-sm">
            <legend className="sr-only">Sections on the public page</legend>
            {SECTIONS.map((s) => (
              <label key={s.key} className="flex items-center gap-3">
                <input type="checkbox" name={s.key} defaultChecked={pub.sections[s.key]} className="size-4 accent-[var(--text)]" />
                {s.label}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" type="submit">Save</Button>
            {pub.enabled && (
              <Link href="/u" className="text-sm font-semibold underline">View public page</Link>
            )}
          </div>
        </ActionForm>
      </Panel>

      <Panel title="Weather you" subtitle="Compare your rainy-day and sunny-day listening in the recap. Only the city and dates are sent to Open-Meteo.">
        <ActionForm action={saveWeatherCity} success="Weather city saved" className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-0 flex-1 gap-1 text-sm font-semibold">City
            <input name="city" defaultValue={weather ?? ""} placeholder="e.g. Ghent" maxLength={80} className="h-11 border border-strong bg-ground px-3 font-normal" />
          </label>
          <Button size="sm" type="submit" className="min-h-11">{weather ? "Update" : "Find and save"}</Button>
          <p className="w-full text-xs text-muted-text">{weather ? `Using ${weather}. Clear the field and save to switch it off.` : "Off. Nothing is sent until you save a city."}</p>
        </ActionForm>
      </Panel>

      <Panel title="Your era edits" subtitle="Names and merges you made. They're re-applied whenever your eras are recalculated.">
        {overrides.length === 0 ? (
          <Empty>No edits. Rename or merge eras from an era&apos;s page.</Empty>
        ) : (
          <ul>
            {overrides.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 border-t border-rule py-2.5 text-sm first:border-t-0">
                <span className="min-w-0 truncate">
                  {o.kind === "rename" ? `Named “${o.name}”` : `Merged ${monthYear(o.from)} – ${monthYear(o.to)}`}
                  {o.unused && <Badge tone="warn" className="ml-2">no longer matches</Badge>}
                </span>
                <ActionForm action={deleteOverride} success="Edit removed">
                  <input type="hidden" name="id" value={o.id} />
                  <Button size="sm" variant="ghost" type="submit">Remove</Button>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Account">
        <form action="/api/auth/logout" method="post">
          <Button size="sm" variant="outline" type="submit">Sign out</Button>
        </form>
      </Panel>
    </div>
  );
}
