import { humanDuration } from "@/lib/time";

const LABEL = { track: "Music", episode: "Podcasts", audiobook: "Audiobooks" } as const;
const COLOR = { track: "var(--chart-1)", episode: "var(--chart-2)", audiobook: "var(--chart-4)" } as const;

/** One stacked bar: how listening time splits across music, podcasts and audiobooks. A single kind gets a sentence, not a full bar. */
export function KindSplit({ kinds }: { kinds: { kind: keyof typeof LABEL; minutes: number }[] }) {
  if (kinds.length === 1) {
    return (
      <p className="text-sm">
        All {LABEL[kinds[0].kind].toLowerCase()}, {humanDuration(kinds[0].minutes)} of it.
        {kinds[0].kind === "track" && <span className="text-muted-text"> Not a single podcast. Respect.</span>}
      </p>
    );
  }
  const total = kinds.reduce((a, k) => a + k.minutes, 0) || 1;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-3 gap-[2px] overflow-hidden" aria-hidden>
        {kinds.map((k) => (
          <span key={k.kind} style={{ width: `${(k.minutes / total) * 100}%`, background: COLOR[k.kind] }} />
        ))}
      </div>
      <dl className="grid grid-cols-3 gap-4">
        {kinds.map((k) => (
          <div key={k.kind}>
            <dt className="flex items-center gap-1.5 text-xs text-muted-text">
              <span className="size-2" style={{ background: COLOR[k.kind] }} aria-hidden />
              {LABEL[k.kind]}
            </dt>
            <dd className="nums mt-1 text-xl font-semibold tracking-tight">{Math.round((k.minutes / total) * 100)}%</dd>
            <dd className="nums text-xs text-faint">{humanDuration(k.minutes)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
