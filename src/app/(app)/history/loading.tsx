import { PageHeader } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading history">
      <PageHeader title="History" description="Your listening, one day at a time." />
      <Skeleton className="mb-6 h-16 w-full" />
      <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2" aria-hidden>
        {Array.from({ length: 6 }, (_, n) => <Skeleton key={n} className="h-28" />)}
      </div>
    </div>
  );
}
