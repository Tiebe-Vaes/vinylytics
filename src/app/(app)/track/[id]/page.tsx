import { notFound } from "next/navigation";
import { ItemPage } from "@/components/sleeve/item-page";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: PageProps<"/track/[id]">) {
  const { id } = await params;
  if (!/^[A-Za-z0-9]{1,64}$/.test(id)) notFound();
  return <ItemPage refOf={{ kind: "track", uri: `spotify:track:${id}` }} inkSeed={id} />;
}
