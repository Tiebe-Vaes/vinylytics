import { isOwner } from "@/lib/owner";
import { searchLibrary } from "@/lib/spotify/library-search";

export const dynamic = "force-dynamic";

/** Suggestions per kind; the full results page still shows up to ten. */
const PER_KIND = 4;
const ORDER = ["artist", "album", "track"] as const;

/** Live search suggestions for the owner, grouped Artists / Albums / Songs. */
export async function GET(req: Request) {
  if (!(await isOwner())) return new Response("Not found", { status: 404 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const results = await searchLibrary(q);
  const groups = ORDER.map((kind) => ({ kind, items: results.filter((r) => r.kind === kind).slice(0, PER_KIND) }))
    .filter((g) => g.items.length > 0);
  return Response.json(groups, { headers: { "Cache-Control": "private, no-store" } });
}
