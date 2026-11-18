/**
 * The Vinylytics voice: a friend who has seen your play counts and won't let
 * it go. Teases the listener, never the artist; every number stays exact.
 * Variants are picked by a hash of the input, so a line doesn't change on
 * every render but does differ between weeks and eras.
 */

const fmt = (n: number) => Math.round(n).toLocaleString("en-GB");
const hours = (minutes: number) => (minutes / 60 >= 10 ? Math.round(minutes / 60) : Math.round((minutes / 60) * 10) / 10);

function pick<T>(options: T[], seed: string): T {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  return options[Math.abs(h) % options.length];
}

export function roastWeek(w: { minutes: number; plays: number; topArtist: string | null; topArtistShare: number }): string {
  const seed = `${w.minutes}|${w.plays}|${w.topArtist}`;
  if (w.minutes === 0) {
    return pick(
      [
        "Zero minutes this week. The silence is deafening, and frankly a little concerning.",
        "Nothing played this week. Touching grass looks good on you, but we miss you.",
      ],
      seed
    );
  }
  const pct = Math.round(w.topArtistShare * 100);
  if (w.topArtist && w.topArtistShare >= 0.5) {
    return pick(
      [
        `${pct}% of your week was ${w.topArtist}. That's not a phase, that's a lifestyle.`,
        `${w.topArtist} got ${pct}% of your ears this week. Blink twice if you need help.`,
        `${pct}% ${w.topArtist}. Other artists exist, we checked.`,
      ],
      seed
    );
  }
  if (w.minutes >= 1200) {
    const h = (w.minutes / 60).toFixed(1);
    return pick(
      [
        `${h} hours this week. That's a part-time job, and nobody's paying you.`,
        `${h} hours in seven days. Your headphones have filed for overtime.`,
      ],
      seed
    );
  }
  return pick(
    [
      `${fmt(w.minutes)} minutes, ${fmt(w.plays)} plays. A perfectly normal week. Suspiciously normal.`,
      `${fmt(w.minutes)} minutes this week. Balanced, healthy, a little boring. We respect it.`,
    ],
    seed
  );
}

export function roastEra(e: { id: string; lead: string; minutes: number; weeks: number; name: string }): string {
  const h = hours(e.minutes);
  return pick(
    [
      `${h} hours of mostly ${e.lead} over ${e.weeks} weeks. Your neighbours know the words too.`,
      `${e.weeks} weeks, ${h} hours, one ${e.lead}-shaped personality.`,
      `You gave ${e.lead} ${h} hours of your one wild and precious life. No regrets, presumably.`,
    ],
    e.id
  );
}

export function roastItem(s: { name: string; streams: number; peakWeekMinutes: number; weeksPlayed: number }): string {
  if (s.streams === 0) return `You've never properly played "${s.name}". Bold of you to look it up.`;
  if (s.streams >= 20 && s.weeksPlayed <= 4) {
    return `${fmt(s.streams)} streams in ${s.weeksPlayed} ${s.weeksPlayed === 1 ? "week" : "weeks"}. "${s.name}" never stood a chance.`;
  }
  return pick(
    [
      `${fmt(s.streams)} plays of "${s.name}". At this point you owe someone royalties.`,
      `"${s.name}": ${fmt(s.streams)} streams and counting. It's not a habit if you can stop. Can you stop?`,
    ],
    `${s.name}|${s.streams}`
  );
}

export function roastEmpty(page: "shelf" | "charts" | "insights" | "history"): string {
  return {
    shelf: "Your shelf is empty. Play something, or import your history and let's see what you've been hiding.",
    charts: "No charts yet. Nobody's topping anything until you press play.",
    insights: "Nothing to roast yet. Give it a few weeks, or import your history to skip the wait.",
    history: "No plays yet. Your history starts the moment you hit play.",
  }[page];
}
