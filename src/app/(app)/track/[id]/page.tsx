import { notFound } from "next/navigation";
import { ItemPage } from "@/components/sleeve/item-page";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: PageProps<"/track/[id]">) {
  const raw = (await params).id;
  // Apple Music plays carry their own "apple:artist:title" id; Spotify ids stay strictly alphanumeric.
  let id = raw;
  // The route segment arrives encoded; the browser build's ?id= arrives decoded and may hold a literal "%".
  try { id = decodeURIComponent(raw); } catch { id = raw; }
  const apple = id.startsWith("apple:") && id.length <= 512;
  if (!apple && !/^[A-Za-z0-9]{1,64}$/.test(id)) notFound();
  return <ItemPage refOf={{ kind: "track", uri: apple ? id : `spotify:track:${id}` }} inkSeed={id} />;
}
