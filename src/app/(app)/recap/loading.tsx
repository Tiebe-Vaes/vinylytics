import { PageHeader } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading your recap">
      <PageHeader title="Year recap" description="Your year in music, drawn from your listening history." />
      <Skeleton className="h-11 w-48" />
      <Skeleton className="mt-5 h-64 w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
        {[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-36" />)}
      </div>
    </div>
  );
}
