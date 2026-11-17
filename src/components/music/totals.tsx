import { Panel } from "@/components/panel";
import { shortDate } from "@/lib/format";
import { humanDuration } from "@/lib/time";
import type { MusicData } from "@/lib/spotify/data";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const fmt = (n: number) => Math.round(n).toLocaleString("en-GB");

/** The year so far as liner-note credits: one row per fact, no hero tile. */
export function Totals({ data, year }: { data: MusicData; year: number }) {
  const thisYear = data.byYear.find((y) => y.year === year)?.minutes ?? 0;
  if (data.totals.streams === 0) {
    return (
      <Panel title={`${year} so far`}>
        <p className="text-sm text-muted-text">Import your history or wait for the first sync.</p>
      </Panel>
    );
  }

  const rows: [string, string][] = [
    ["Listened", `${fmt(thisYear)} min (${humanDuration(thisYear)}), ${fmt(data.todayMinutes)} today`],
    ["Streams", `${fmt(data.totals.streams)} across ${fmt(data.totals.artists)} artists`],
    ["Streak", `${data.streaks.current} ${data.streaks.current === 1 ? "day" : "days"} now, longest ${data.streaks.longest}`],
  ];
  if (data.mostActiveWeekday) rows.push(["Busiest weekday", `${WEEKDAYS[data.mostActiveWeekday.weekday]}, ${fmt(data.mostActiveWeekday.avgMinutes)} min on average`]);
  if (data.biggestDay) rows.push(["Biggest day", `${shortDate(data.biggestDay.date)}, ${fmt(data.biggestDay.minutes)} min`]);

  return (
    <Panel title={`${year} so far`}>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 border-t border-rule py-2.5 text-sm first:border-t-0">
            <dt className="text-muted-text">{k}</dt>
            <dd className="min-w-0 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
