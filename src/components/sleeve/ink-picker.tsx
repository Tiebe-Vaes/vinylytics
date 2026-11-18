"use client";

import { useId, useState } from "react";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Check, ChevronDown } from "lucide-react";
import { CLASSIC_INKS, INKS, inkHex, inkName, inkText, type InkId } from "@/lib/ink";
import { cn } from "@/lib/utils";

const KEY = "vinylytics:recent-inks";
const MAX_RECENT = 5;

/** Most recent first, no duplicates, at most five. */
export function pushRecent(list: InkId[], id: InkId): InkId[] {
  return [id, ...list.filter((v) => v !== id)].slice(0, MAX_RECENT);
}

function readRecent(): InkId[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is InkId => INKS.some((i) => i.id === v)).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function Swatch({ id, label, big }: { id: InkId; label?: string; big?: boolean }) {
  const hex = inkHex(id);
  return (
    <Radio.Root value={id} aria-label={label ? `${label}: ${inkName(id)}` : inkName(id)} title={inkName(id)}
      className={cn("grid place-items-center border border-white/25 outline-none transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-ground data-[checked]:ring-2 data-[checked]:ring-text data-[checked]:ring-offset-2 data-[checked]:ring-offset-ground",
        big ? "flex h-11 min-w-16 gap-1 px-2 text-xs font-semibold" : "aspect-square min-h-9")}
      style={{ background: hex, color: inkText(hex) }}>
      {label && <span>{label}</span>}
      <Radio.Indicator><Check className="size-4" aria-hidden="true" /></Radio.Indicator>
    </Radio.Root>
  );
}

/**
 * The common palette pattern: this card's own ink, recent picks and the classics up front,
 * the full palette one tap away. Expands inline: a native modal <dialog> sits in the top layer,
 * so a portalled popover would open behind it.
 */
export function InkPicker({ value, eraInk, eraLabel, onChange }: { value: InkId; eraInk: InkId; eraLabel: string; onChange: (id: InkId) => void }) {
  // The composer only mounts after a click, never on the server, so storage can be read up front.
  const [recent, setRecent] = useState<InkId[]>(readRecent);
  const [more, setMore] = useState(false);
  const panel = useId();

  function pick(id: InkId) {
    onChange(id);
    const next = pushRecent(recent, id);
    setRecent(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Recents are a convenience only. */ }
  }

  const quick = [...new Set<InkId>([...recent, ...CLASSIC_INKS.map((i) => i.id)])].filter((id) => id !== eraInk);
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 font-semibold">Ink · {inkName(value)}</legend>
      <RadioGroup aria-label="Ink" value={value} onValueChange={(v) => pick(v as InkId)} className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Swatch id={eraInk} label={eraLabel} big />
          {quick.slice(0, 10).map((id) => <div key={id} className="w-9"><Swatch id={id} /></div>)}
        </div>
        <button type="button" aria-expanded={more} aria-controls={panel} onClick={() => setMore(!more)}
          className="flex min-h-11 items-center gap-2 self-start text-sm font-semibold underline-offset-4 hover:underline">
          More colours <ChevronDown className={cn("size-4 transition-transform duration-200", more && "rotate-180")} aria-hidden="true" />
        </button>
        <div id={panel} hidden={!more} className="max-h-[17rem] overflow-y-auto pr-1">
          <div className="grid grid-cols-8 gap-1.5">
            {INKS.filter((i) => i.id !== eraInk && !quick.slice(0, 10).includes(i.id)).map((i) => <Swatch key={i.id} id={i.id} />)}
          </div>
        </div>
      </RadioGroup>
    </fieldset>
  );
}
