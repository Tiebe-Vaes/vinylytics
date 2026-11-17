import { PageHeader } from "@/components/panel";
import { SpotifyImport } from "@/components/music/spotify-import";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Import history"
        description="Request it at spotify.com → Account → Privacy → Extended streaming history. Spotify takes up to 30 days."
      />
      <SpotifyImport />
    </div>
  );
}
