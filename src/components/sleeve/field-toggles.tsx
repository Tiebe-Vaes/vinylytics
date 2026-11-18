"use client";

import { Check } from "lucide-react";
import { FIELDS, FIELD_LABELS, type CardField, type CardKind } from "@/lib/card-options";
import { inkHex, inkText, type InkId } from "@/lib/ink";

/** Each optional fact as a card showing its real value; on cards fill with the ink. */
export function FieldToggles({ kind, fields, preview, ink, onToggle }: {
  kind: CardKind; fields: CardField[]; preview?: Partial<Record<CardField, string>>; ink: InkId; onToggle: (field: CardField) => void;
}) {
  const bg = inkHex(ink);
  const fg = inkText(bg);
  return (
    <fieldset><legend className="mb-2 font-semibold">Show on card</legend>
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map((f) => {
          const on = fields.includes(f);
          const value = preview?.[f];
          return (
            <button key={f} type="button" role="checkbox" aria-checked={on}
              onClick={() => onToggle(f)}
              className="group relative flex min-h-16 min-w-0 flex-col items-start justify-center border border-strong px-3 py-2 text-left transition-[transform,background-color] duration-150 hover:-translate-y-0.5 active:scale-[0.97] aria-[checked=false]:hover:bg-raised"
              style={on ? { background: bg, color: fg, borderColor: bg } : undefined}>
              <span className="text-xs font-semibold opacity-80">{FIELD_LABELS[kind][f]}</span>
              {value && <span className="w-full truncate text-sm font-semibold" title={value}>{value}</span>}
              {on && <Check className="absolute top-1.5 right-1.5 size-4" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
