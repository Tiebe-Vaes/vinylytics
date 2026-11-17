import { notFound } from "next/navigation";
import { ItemPage } from "@/components/sleeve/item-page";

export const dynamic = "force-dynamic";

export default async function AlbumPage({ params }: PageProps<"/album/[id]">) {
  const { id } = await params;
  if (!/^[A-Za-z0-9]{1,64}$/.test(id)) notFound();
  return <ItemPage refOf={{ kind: "album", albumId: id }} inkSeed={id} />;
}
