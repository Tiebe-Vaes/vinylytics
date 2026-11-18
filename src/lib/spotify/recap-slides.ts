import type { InkId } from "@/lib/ink";
import type { loadRecap } from "./recap";
import type { RecapExtras } from "./recap-extras";
import { vinylPhysics } from "./recap-stats/vinyl";

export type Slide = { id: string; kicker: string; headline: string; detail?: string; ink: InkId };
type Recap = Pick<Awaited<ReturnType<typeof loadRecap>>, "minutes" | "artist" | "track" | "peakHour">;
type Extras = Partial<Pick<RecapExtras, "obsessed" | "owl" | "season" | "mood" | "crush" | "race" | "grid" | "best">> | null;

const n = (v: number) => Math.round(v).toLocaleString("en-GB");

/** "Play my year": one slide per stat that exists, in a fixed order. */
export function recapSlides(recap: Recap, x: Extras): Slide[] {
  const out: (Slide | null)[] = [
    { id: "minutes", kicker: "This year you listened for", headline: `${n(recap.minutes)} minutes`, detail: `That's ${n(recap.minutes / 1440)} full days.`, ink: "cobalt" },
    recap.artist && { id: "artist", kicker: "Your most played artist", headline: recap.artist.name, ink: "redviolet" },
    recap.track && { id: "song", kicker: "Your song of the year", headline: recap.track.name, detail: recap.track.subtitle, ink: "vermilion" },
    x?.obsessed ? { id: "obsession", kicker: `On ${x.obsessed.day} you played one song`, headline: `${x.obsessed.plays} times`, detail: `${x.obsessed.track} · ${x.obsessed.artist}`, ink: "plum" } : null,
    x?.owl ? { id: "owl", kicker: "You are a", headline: x.owl.persona, detail: `${Math.round(x.owl.share * 100)}% of your minutes came after midnight.`, ink: x.owl.persona === "Night owl" ? "plum" : "orange" } : null,
    x?.season && (x.season.summer || x.season.winter) ? { id: "seasons", kicker: "Summer you vs winter you", headline: `${x.season.summer?.artist ?? "—"} / ${x.season.winter?.artist ?? "—"}`, ink: "orange" } : null,
    x?.mood && (x.mood.restless || x.mood.comfort || x.mood.spiral || x.mood.euphoric) ? (() => {
      const [label, m] = ([["Most restless day", x.mood.restless], ["Comfort day", x.mood.comfort], ["Late-night spiral", x.mood.spiral], ["Euphoric day", x.mood.euphoric]] as const).find(([, v]) => v)!;
      return { id: "mood", kicker: label, headline: m!.day, detail: m!.detail, ink: "teal" as const };
    })() : null,
    x?.crush?.fastest ? { id: "crush", kicker: "Fastest crush", headline: x.crush.fastest.track, detail: `20 plays in ${x.crush.fastest.days} days.`, ink: "redviolet" } : null,
    x?.race && x.race.length > 1 ? { id: "race", kicker: "Number one changed hands", headline: `${new Set(x.race.map((r) => r.artist)).size} artists led a month`, ink: "mustard" } : null,
    recap.minutes > 0 ? { id: "vinyl", kicker: "On a turntable that's", headline: `${n(vinylPhysics(recap.minutes).rotations)} turns`, detail: `${vinylPhysics(recap.minutes).grooveKm.toFixed(1)} km of groove.`, ink: "green" } : null,
    x?.grid?.some((row) => row.some((m) => m > 0)) ? { id: "fingerprint", kicker: "Your listening fingerprint", headline: "Yours alone", ink: "cobalt" } : null,
    x?.best?.artist ? { id: "goat", kicker: "All-time favourite", headline: x.best.artist.name, detail: `${n(x.best.artist.minutes / 60)} hours, ever.`, ink: "mustard" } : null,
  ];
  return out.filter((s): s is Slide => Boolean(s));
}
