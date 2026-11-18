import { PageHeader } from "@/components/panel";
import { VinylLoader } from "@/components/vinyl-loader";

export default function Loading() {
  return (
    <>
      <PageHeader title="Library search" />
      <VinylLoader label="Searching your library…" className="py-16" />
    </>
  );
}
