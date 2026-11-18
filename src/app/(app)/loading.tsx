import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading your library" className="space-y-6">
      <Skeleton className="h-12 w-48 max-w-full" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-hidden>
        {[0, 1, 2, 3].map((n) => <Skeleton key={n} className="aspect-square" />)}
      </div>
    </div>
  );
}
