import { PageHeader, Card } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { getSpotifyStatus } from "@/lib/spotify/client";
import { shortDate } from "@/lib/format";
import { clock, localDateKey } from "@/lib/time";
import { syncNow } from "./actions";

export const dynamic = "force-dynamic";

const LABEL = { connected: "Connected", broken: "Needs reconnect", "not-connected": "Not connected" } as const;

export default async function SettingsPage() {
  const spotify = await getSpotifyStatus().catch(() => ({ state: "not-connected" as const, lastSyncAt: null }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" />
      <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold">Spotify · {LABEL[spotify.state]}</p>
          {spotify.lastSyncAt && (
            <p className="text-sm text-muted-foreground">
              Last sync {shortDate(localDateKey(spotify.lastSyncAt))} · {clock(spotify.lastSyncAt)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {spotify.state === "connected" ? (
            <form action={syncNow}>
              <Button size="sm" variant="outline" type="submit">Sync now</Button>
            </form>
          ) : (
            <Button size="sm" variant="outline" render={<a href="/api/auth/login" />} nativeButton={false}>
              Reconnect
            </Button>
          )}
          <form action="/api/auth/logout" method="post">
            <Button size="sm" variant="ghost" type="submit">Sign out</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
