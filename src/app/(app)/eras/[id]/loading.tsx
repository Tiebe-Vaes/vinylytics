import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading era" className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
      <Skeleton className="aspect-square w-full" />
      <div className="space-y-4" aria-hidden>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-11 w-32" />
      </div>
    </div>
  );
}
