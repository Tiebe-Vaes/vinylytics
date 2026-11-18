import { ArrowRight, Search } from "lucide-react";

export function LibrarySearch({ query = "" }: { query?: string }) {
  return (
    <form action="/search" role="search" aria-label="Music library" className="flex min-w-0 items-center border border-strong bg-ground focus-within:border-text">
      <Search className="ml-3 size-4 shrink-0 text-muted-text" aria-hidden />
      <input aria-label="Search your library" type="search" name="q" defaultValue={query} maxLength={100} placeholder="Search your library" className="h-11 w-36 min-w-0 flex-1 bg-transparent px-2 text-sm sm:w-48" />
      <button aria-label="Search" className="flex size-11 shrink-0 items-center justify-center hover:bg-muted"><ArrowRight className="size-4" aria-hidden /></button>
    </form>
  );
}
