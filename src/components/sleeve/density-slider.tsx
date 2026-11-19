"use client";

import { Slider } from "@base-ui/react/slider";
import { DENSITIES, type Density } from "@/lib/card-options";

const label = (d: Density) => d.charAt(0).toUpperCase() + d.slice(1);

/** A sketch of the card at one detail step: art and title always, then dates, lead, total and the list. */
function Thumb({ level }: { level: number }) {
  return (
    <svg viewBox="0 0 40 50" aria-hidden="true" className="w-full">
      <rect x={0.5} y={0.5} width={39} height={49} fill="none" stroke="currentColor" opacity={0.5} />
      {level >= 1 && <rect x={4} y={4} width={12} height={1.6} fill="currentColor" opacity={0.6} />}
      <rect x={22} y={level >= 4 ? 7 : 9} width={14} height={level >= 4 ? 10 : 16} fill="currentColor" opacity={0.35} />
      <rect x={4} y={level >= 4 ? 21 : 29} width={24} height={3.4} fill="currentColor" />
      {level >= 2 && <rect x={4} y={level >= 4 ? 26 : 34} width={16} height={1.8} fill="currentColor" opacity={0.7} />}
      {level >= 3 && <rect x={4} y={level >= 4 ? 29.5 : 37.5} width={11} height={2.6} fill="currentColor" />}
      {level >= 4 && [34, 37, 40].map((y) => <rect key={y} x={4} y={y} width={26} height={1.4} fill="currentColor" opacity={0.6} />)}
      <rect x={4} y={45} width={9} height={1.4} fill="currentColor" opacity={0.6} />
    </svg>
  );
}

/** Five snap stops from Minimal to Maximal; `custom` shows when the toggles no longer match a stop. */
export function DensitySlider({ value, custom, onChange }: { value: Density; custom: boolean; onChange: (d: Density) => void }) {
  return (
    <div>
      <p className="mb-2 flex justify-between font-semibold"><span>Detail</span><span className="text-sm text-muted-text">{custom ? "Custom" : label(value)}</span></p>
      {/* Tap a sketch to jump there; the slider stays the keyboard control. */}
      <div className="mb-1 grid grid-cols-5 gap-2">
        {DENSITIES.map((d, i) => (
          <button key={d} type="button" tabIndex={-1} aria-hidden="true" onClick={() => onChange(d)}
            className={`p-1 transition-[color,transform] duration-150 hover:-translate-y-0.5 ${!custom && d === value ? "text-text" : "text-muted-text"}`}>
            <Thumb level={i} />
          </button>
        ))}
      </div>
      <Slider.Root min={0} max={DENSITIES.length - 1} step={1} value={DENSITIES.indexOf(value)}
        onValueChange={(v) => onChange(DENSITIES[v as number])}>
        <Slider.Control className="flex h-11 w-full touch-none items-center">
          <Slider.Track className="relative h-1.5 w-full bg-raised">
            <Slider.Indicator className="bg-text" />
            <Slider.Thumb aria-label="Card detail" getAriaValueText={(_, v) => label(DENSITIES[v])}
              className="size-6 rounded-full border-2 border-ground bg-text shadow transition-transform duration-150 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text active:scale-95" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <div className="mt-1 flex justify-between text-xs text-muted-text" aria-hidden="true">
        {DENSITIES.map((d) => <span key={d}>{label(d)}</span>)}
      </div>
    </div>
  );
}
