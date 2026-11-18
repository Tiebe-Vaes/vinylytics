import type { InkId } from "@/lib/ink";

type EraLike = { id: string; start: string; end: string; ink: InkId; name: string };
export type Segment = { id: string; left: number; width: number; lane: number; ink: InkId; name: string; start: string; end: string };

const dayIndex = (key: string) => Date.parse(`${key}T00:00:00Z`) / 86_400_000;

/** Eras as fractions of [from, to] (inclusive days); an era overlapping an earlier one drops to the next free lane. */
export function timelineSegments(eras: EraLike[], from: string, to: string): Segment[] {
  const a = dayIndex(from);
  const span = Math.max(1, dayIndex(to) + 1 - a);
  const laneEnds: number[] = [];
  return [...eras]
    .sort((x, y) => x.start.localeCompare(y.start))
    .filter((era) => era.end >= from && era.start <= to)
    .map((era) => {
      const s = Math.max(dayIndex(era.start), a);
      const e = Math.min(dayIndex(era.end) + 1, a + span);
      let lane = laneEnds.findIndex((end) => end <= s);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = e;
      return { id: era.id, name: era.name, ink: era.ink, start: era.start, end: era.end, lane, left: (s - a) / span, width: (e - s) / span };
    });
}
