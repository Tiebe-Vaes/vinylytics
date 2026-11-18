"use client";

import { Slider } from "@base-ui/react/slider";
import { DENSITIES, type Density } from "@/lib/card-options";

const label = (d: Density) => d.charAt(0).toUpperCase() + d.slice(1);

/** Five snap stops from Minimal to Maximal; `custom` shows when the toggles no longer match a stop. */
export function DensitySlider({ value, custom, onChange }: { value: Density; custom: boolean; onChange: (d: Density) => void }) {
  return (
    <div>
      <p className="mb-2 flex justify-between font-semibold"><span>Detail</span><span className="text-sm text-muted-text">{custom ? "Custom" : label(value)}</span></p>
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
