import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Empty, PageHeader, Panel } from "@/components/panel";
import { Cover } from "@/components/sleeve/cover";
import { searchLibrary } from "@/lib/spotify/library-search";

export default async function SearchPage({searchParams}: {searchParams: Promise<{q?: string | string[]}>}) {
  const { q } = await searchParams;
  const term = typeof q === "string" ? q.trim().slice(0,100) : "";
  const results = await searchLibrary(term);
  return <>
    <PageHeader title="Library search" description={term ? `Results for “${term}”` : "Find an artist, song or album in your listening history."} />
    {term && results.length === 0 && <Empty>No matches. Try part of the artist, song or album name.</Empty>}
    <div className="grid gap-8 lg:grid-cols-3">
      {(["artist","track","album"] as const).map(kind => {
        const matches = results.filter(row => row.kind === kind);
        return matches.length > 0 && <Panel key={kind} title={{artist:"Artists",track:"Songs",album:"Albums"}[kind]}>
          <ul>{matches.map(row => <li key={row.key}>
            <Link href={row.href} className="group flex items-center gap-3 border-b border-rule px-1 py-3 transition-colors duration-200 hover:bg-muted focus-visible:bg-muted">
              <Cover url={row.cover} alt="" size={42}/>
              <span className="min-w-0 flex-1"><strong className="link-underline break-words">{row.name}</strong>{row.subtitle && <small className="text-muted-text">{row.subtitle}</small>}</span>
              <ArrowUpRight className="hover-reveal size-4 shrink-0" aria-hidden />
            </Link>
          </li>)}</ul>
        </Panel>;
      })}
    </div>
  </>;
}
