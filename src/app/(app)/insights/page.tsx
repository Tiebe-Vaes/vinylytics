import { Card, CardHeader, Empty, PageHeader } from "@/components/panel";
import { cachedInsights } from "@/lib/spotify/insights";

export const dynamic = "force-dynamic";

function Section({ title, subtitle, items }: { title: string; subtitle: string; items: string[] }) {
  return (
    <Card className="flex flex-col gap-2 px-5 py-4">
      <CardHeader title={title} subtitle={subtitle} />
      {items.length === 0 ? (
        <Empty>Nothing here yet.</Empty>
      ) : (
        <ol className="flex flex-col gap-1 text-sm">
          {items.map((item, i) => (
            <li key={i} className="min-w-0 truncate">{item}</li>
          ))}
        </ol>
      )}
    </Card>
  );
}

// shortcut: plain lists until plan 3's sleeve UI.
export default async function InsightsPage() {
  const i = await cachedInsights();
  const recentMonths = i.newVsFamiliar.slice(-12).reverse();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Insights" description="What the charts don't show." />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Section
          title="On this day"
          subtitle="The same date in earlier years"
          items={i.onThisDay.map((o) =>
            `${o.year}: ${o.topTrack ? `${o.topTrack.name} – ${o.topTrack.artist} (${o.topTrack.streams}×)` : "—"}${o.firstHeard.length ? ` · first heard ${o.firstHeard.map((f) => f.name).join(", ")}` : ""}`
          )}
        />
        <Section
          title="B-sides"
          subtitle="Once on heavy rotation, silent for 6+ months"
          items={i.bSides.map((b) => `${b.name} – ${b.artist} · ${b.streams} streams · last ${b.lastPlay}`)}
        />
        <Section
          title="Reissues"
          subtitle="Songs you came back to after a long gap"
          items={i.reissues.map((r) => `${r.name} – ${r.artist} · back on ${r.backOn} after ${r.gapDays} days · ${r.streamsAfter} since`)}
        />
        <Section
          title="New vs familiar"
          subtitle="Minutes on tracks first heard that month, last 12 months"
          items={recentMonths.map((m) => {
            const total = m.newMinutes + m.familiarMinutes;
            return `${m.month}: ${total ? Math.round((m.newMinutes / total) * 100) : 0}% new · ${Math.round(total)} min`;
          })}
        />
        <Section
          title="Stayers"
          subtitle="Artists you keep coming back to"
          items={i.loyalty.stayers.map((s) => `${s.artist} · ${Math.round(s.activeMonthShare * 100)}% of months · ${s.streams} streams`)}
        />
        <Section
          title="One and done"
          subtitle="A month of obsession, then never again"
          items={i.loyalty.oneAndDone.map((o) => `${o.artist} · ${o.streams} streams from ${o.firstPlay}`)}
        />
        <Section
          title="Album completion"
          subtitle="Albums you played front to back"
          items={i.albumCompletion.map((a) => `${a.name} – ${a.artist} · ${a.played}/${a.total}`)}
        />
        <Section
          title="Streaks"
          subtitle="Most days in a row with one artist"
          items={i.artistStreaks.map((s) => `${s.artist} · ${s.days} days (${s.from} – ${s.to})`)}
        />
      </div>
    </div>
  );
}
