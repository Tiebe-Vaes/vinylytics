import { addDaysKey } from "@/lib/time";

/** Shortcuts for the History day picker, as local date keys. A leap day steps back to 28 Feb. */
export function dayPresets(today: string): { label: string; day: string }[] {
  const [y, m, d] = today.split("-");
  const lastYear = `${Number(y) - 1}-${m}-${m === "02" && d === "29" ? "28" : d}`;
  return [
    { label: "Today", day: today },
    { label: "Yesterday", day: addDaysKey(today, -1) },
    { label: "A week ago", day: addDaysKey(today, -7) },
    { label: "A year ago", day: lastYear },
  ];
}
