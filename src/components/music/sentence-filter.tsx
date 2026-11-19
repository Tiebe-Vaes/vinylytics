"use client";

import Form from "next/form";
import Link from "next/link";
import { Popover } from "@base-ui/react/popover";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SlotOption = { value: string; label: string; href: string };
type Slot = { name: string; value: string; label: string; options: SlotOption[] };

/** One bold word of the sentence; opens a short list of choices. */
function Word({ slot, children }: { slot: Slot; children?: React.ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger aria-label={`${slot.name}: ${slot.label}`}
        className="group inline-flex min-h-11 items-center gap-1 border-b-2 border-current px-1 font-bold text-text transition-colors hover:text-brand data-[popup-open]:text-brand">
        {slot.label}<ChevronDown className="size-5 transition-transform duration-200 group-data-[popup-open]:rotate-180" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} className="z-50">
          <Popover.Popup className="min-w-48 origin-[var(--transform-origin)] border border-strong bg-ground p-1 text-base shadow-lg transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <ul aria-label={slot.name}>
              {slot.options.map((o) => (
                <li key={o.value}>
                  <Link href={o.href} scroll={false} aria-current={o.value === slot.value ? "true" : undefined}
                    className={cn("flex min-h-11 items-center px-3 text-sm font-semibold hover:bg-muted", o.value === slot.value && "bg-text text-ground hover:bg-text")}>
                    {o.label}
                  </Link>
                </li>
              ))}
            </ul>
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** "Top [artists] of the [last 4 weeks] by [minutes]": each bold word is a menu; URLs stay as before. */
export function SentenceFilter({ kind, range, sort, custom, max }: {
  kind: Slot; range: Slot; sort: Slot;
  custom: { from: string; to: string; hidden: Record<string, string> };
  max: string;
}) {
  return (
    <p className="display flex flex-wrap items-baseline gap-x-2 gap-y-1 text-3xl leading-tight md:text-5xl">
      <span>Top</span><Word slot={kind} /><span>{range.value === "all" ? "of" : range.value === "custom" ? "from" : "of the"}</span>
      <Word slot={range}>
        <Form action="/charts" className="mt-1 grid gap-2 border-t border-rule p-2 font-sans text-sm normal-case">
          {Object.entries(custom.hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <input type="hidden" name="range" value="custom" />
          {(["from", "to"] as const).map((name) => (
            <label key={name} className="grid gap-1 capitalize">{name}
              <input required type="date" name={name} max={max} defaultValue={custom[name]} className="h-11 border border-strong bg-ground px-2" />
            </label>
          ))}
          <button className="h-11 bg-text px-4 font-semibold text-ground">Apply dates</button>
        </Form>
      </Word>
      <span>by</span><Word slot={sort} />
    </p>
  );
}
