import Link from "next/link";
import { Empty, PageHeader, Panel } from "@/components/panel";
import { CompareLink } from "@/components/recap/compare-link";
import { getRecapExtras } from "@/lib/spotify/recap-extras";
import { compareTaste, decodeTaste, encodeTaste } from "@/lib/taste-code";
import { localDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

/** A friend's link (`?with=<code>`) against your own top artists for the same year. */
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const code = (await searchParams).with;
  const theirs = typeof code === "string" ? decodeTaste(code) : null;
  const year = theirs?.year ?? Number(localDateKey().slice(0, 4));
  const mine = ((await getRecapExtras(year))?.topArtists ?? []).map((a) => a.name);
  const myCode = mine.length ? encodeTaste(year, mine) : null;

  if (!theirs) {
    return <>
      <PageHeader title="Compare" description="Send a friend your link. Their own Vinylytics compares it with their history; nothing is uploaded or stored." />
      {code && <p role="alert" className="mb-4 text-sm">That link isn’t a Vinylytics compare link. Ask your friend to send it again.</p>}
      {myCode ? <CompareLink code={myCode} label={`Share my ${year} link`} /> : <Empty>Import your history first, then share your link.</Empty>}
    </>;
  }

  const result = compareTaste(mine, theirs.artists);
  const list = (title: string, names: string[], empty: string) => (
    <Panel title={title}>{names.length ? <ol className="grid gap-1">{names.map((name) => <li key={name} className="border-b border-rule py-2 text-sm font-semibold">{name}</li>)}</ol> : <Empty>{empty}</Empty>}</Panel>
  );
  return <>
    <PageHeader title={`${result.match}% match`} description={`Your ${year} top artists against your friend’s. ${result.shared.length} of them overlap.`} />
    {!mine.length && <p className="mb-6 text-sm">You have no listening in {year} yet, so there is nothing to compare. <Link href="/settings/import" className="underline">Import your history</Link>.</p>}
    <div className="grid gap-8 md:grid-cols-3">
      {list("You both love", result.shared, "No shared artists. Time for a mixtape swap.")}
      {list("Only you", result.onlyMine, "Nothing only you play.")}
      {list("Only your friend", result.onlyTheirs, "Nothing only they play.")}
    </div>
    {myCode && <div className="mt-8"><CompareLink code={myCode} label="Send my link back" /></div>}
  </>;
}
