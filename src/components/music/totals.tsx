import { Card } from "@/components/panel";
import { shortDate } from "@/lib/format";
import { humanDuration } from "@/lib/time";
import type { MusicData } from "@/lib/spotify/data";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const fmt = (n: number) => Math.round(n).toLocaleString("en-GB");

/**
 * The music glance strip: one bordered panel, a big hero figure for this
 * year's minutes, then the cells that answer "how much, how often".
 */
export function Totals({ data, year }: { data: MusicData; year: number }) {
  const thisYear = data.byYear.find((y) => y.year === year)?.minutes ?? 0;
  const empty = data.totals.streams === 0;

  return (
    <Card className="grid grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
      <div className="col-span-2 flex flex-col justify-end border-b border-border p-5 sm:p-6 lg:col-span-1 lg:border-r lg:border-b-0">
        <span className="text-xs text-muted-foreground">Minutes in {year}</span>
        <span className="nums mt-2 text-5xl leading-none font-semibold tracking-tight sm:text-6xl">
          {empty ? "—" : fmt(thisYear)}
        </span>
        <span className="nums mt-2 text-xs text-faint">
          {empty ? "Import your history or wait for the first sync." : `${humanDuration(thisYear)} · ${fmt(data.todayMinutes)} min today`}
        </span>
      </div>
      <Cell
        label="Streams"
        value={empty ? "—" : fmt(data.totals.streams)}
        detail={empty ? undefined : `${fmt(data.totals.artists)} artists`}
        className="border-r border-b border-border lg:border-b-0"
      />
      <Cell
        label="Streak"
        value={empty ? "—" : `${data.streaks.current} ${data.streaks.current === 1 ? "day" : "days"}`}
        detail={empty ? undefined : `Longest ${data.streaks.longest} days`}
        className="border-b border-border lg:border-r lg:border-b-0"
      />
      <Cell
        label="Most active day"
        value={data.mostActiveWeekday ? WEEKDAYS[data.mostActiveWeekday.weekday] : "—"}
        detail={data.mostActiveWeekday ? `${fmt(data.mostActiveWeekday.avgMinutes)} min on average` : undefined}
        className="border-r border-border"
      />
      <Cell
        label="Biggest day"
        value={data.biggestDay ? shortDate(data.biggestDay.date) : "—"}
        detail={data.biggestDay ? `${fmt(data.biggestDay.minutes)} min` : undefined}
      />
    </Card>
  );
}

function Cell({ label, value, detail, className }: { label: string; value: string; detail?: string; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col justify-end p-5 ${className ?? ""}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="nums mt-1.5 truncate text-xl font-semibold tracking-tight">{value}</span>
      {detail && <span className="nums mt-0.5 truncate text-xs text-faint">{detail}</span>}
    </div>
  );
}
