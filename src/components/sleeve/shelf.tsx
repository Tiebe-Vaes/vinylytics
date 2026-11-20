import Link from "next/link";
import type { EraView } from "@/lib/spotify/eras-data";
import { roastEmpty } from "@/lib/roast";
import { Sleeve } from "./sleeve";

/**
 * Your eras as records on a shelf, newest first. The row scrolls on its own
 * with snap points, so the page never scrolls sideways; the next sleeve peeks
 * in to say there's more.
 */
export function Shelf({ eras, linkable = true }: { eras: EraView[]; linkable?: boolean }) {
  if (eras.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full max-w-sm flex-col justify-end border border-dashed border-strong p-5">
        <p className="display text-3xl">Empty shelf</p>
        <p className="mt-2 text-sm text-muted-text">{roastEmpty("shelf")}</p>
        {linkable && (
          <Link href="/settings/import" className="mt-4 text-sm font-semibold underline">
            Import your history
          </Link>
        )}
      </div>
    );
  }
  const newestFirst = [...eras].reverse();
  return (
    <ul
      aria-label="Your eras"
      // Newest first in the DOM (focus order), drawn old → new like the era timeline; a reversed row opens at its newest end.
      className="flex flex-row-reverse snap-x snap-mandatory gap-4 overflow-x-auto px-1 pt-1 pb-4"
    >
      {newestFirst.map((era) => (
        <li key={era.id} className="w-[min(79vw,320px)] shrink-0 snap-start">
          <Sleeve era={era} href={linkable ? undefined : null} />
        </li>
      ))}
    </ul>
  );
}
