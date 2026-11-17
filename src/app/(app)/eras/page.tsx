import { Badge, Card, CardHeader, Empty, PageHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { getEras } from "@/lib/spotify/eras-data";
import { deleteOverride, mergeWithNext, renameEra } from "./actions";

export const dynamic = "force-dynamic";

const monthYear = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

// shortcut: plain list until plan 3 presses each era as a sleeve.
export default async function ErasPage() {
  const { eras, overrides } = await getEras();
  const newestFirst = [...eras].reverse();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Eras" description="Your history cut into phases by who you listened to most." />
      {eras.length === 0 ? (
        <Card className="px-5 py-6">
          <Empty>No eras yet: listen for a few weeks or import your history.</Empty>
        </Card>
      ) : (
        newestFirst.map((era) => {
          const isNewest = era.id === eras.at(-1)!.id;
          return (
            <Card key={era.id} className="flex flex-col gap-3 px-5 py-4">
              <CardHeader
                title={era.name}
                subtitle={`${monthYear(era.start)} – ${monthYear(era.end)} · ${era.weeks} weeks · ${Math.round(era.minutes / 60)} h`}
              />
              <p className="text-sm text-muted-foreground">{era.artists.map((a) => a.name).join(" · ")}</p>
              <div className="flex flex-wrap gap-2">
                <form action={renameEra} className="flex min-w-0 flex-1 gap-2">
                  <input type="hidden" name="eraId" value={era.id} />
                  <input
                    name="name"
                    defaultValue={era.renamedBy ? era.name : ""}
                    placeholder="Name this era"
                    maxLength={80}
                    aria-label={`Name for ${era.name}`}
                    className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                  />
                  <Button size="sm" variant="outline" type="submit">Save</Button>
                </form>
                {!isNewest && (
                  <form action={mergeWithNext}>
                    <input type="hidden" name="eraId" value={era.id} />
                    <Button size="sm" variant="ghost" type="submit">Merge with next</Button>
                  </form>
                )}
              </div>
            </Card>
          );
        })
      )}

      {overrides.length > 0 && (
        <Card className="flex flex-col gap-2 px-5 py-4">
          <CardHeader title="Your edits" subtitle="Re-applied every time your eras are recalculated." />
          {overrides.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                {o.kind === "rename" ? `Named “${o.name}”` : `Merged ${monthYear(o.from)} – ${monthYear(o.to)}`}
                {o.unused && <Badge tone="warn" className="ml-2">unused</Badge>}
              </span>
              <form action={deleteOverride}>
                <input type="hidden" name="id" value={o.id} />
                <Button size="sm" variant="ghost" type="submit">Remove</Button>
              </form>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
