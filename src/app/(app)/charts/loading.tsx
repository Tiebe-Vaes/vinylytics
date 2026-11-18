import { PageHeader } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading charts">
      <PageHeader title="Charts" description="Your record collection, ranked." />
      <Skeleton className="h-14 w-full max-w-2xl" />
      <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5" aria-hidden>
        {Array.from({ length: 10 }, (_, n) => <div key={n}><Skeleton className="aspect-square" /><Skeleton className="mt-2 h-4 w-3/4" /></div>)}
      </div>
    </div>
  );
}
