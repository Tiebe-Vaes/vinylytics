import { ItemPage } from "@/components/sleeve/item-page";

export const dynamic = "force-dynamic";

export default async function ArtistPage({ params }: PageProps<"/artist/[name]">) {
  const name = decodeURIComponent((await params).name);
  return <ItemPage refOf={{ kind: "artist", name }} inkSeed={name} />;
}
