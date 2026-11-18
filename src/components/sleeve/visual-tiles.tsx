"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Check } from "lucide-react";
import { VISUALS, VISUAL_LABELS, type CardVisual } from "@/lib/card-options";
import { inkHex, inkText, type InkId } from "@/lib/ink";

/** A small drawing of each visual's shape, in a 40×50 box like the post card. */
function Shape({ visual, fg }: { visual: CardVisual; fg: string }) {
  const disc = (cx: number, cy: number, r: number) => (
    <><circle cx={cx} cy={cy} r={r} fill="#0f0f10" /><circle cx={cx} cy={cy} r={r * 0.34} fill={fg} /></>
  );
  switch (visual) {
    case "sleeve": return <>{disc(25, 22, 11)}<rect x={7} y={12} width={18} height={20} fill={fg} opacity={0.55} /></>;
    case "grooves": return <>{[13, 10, 7].map((r) => <circle key={r} cx={20} cy={22} r={r} fill="none" stroke={fg} strokeWidth={1.2} />)}<circle cx={20} cy={22} r={3.5} fill={fg} /></>;
    case "turntable": return <>{disc(18, 24, 12)}<path d="M34 8 L31 26 L25 30" stroke={fg} strokeWidth={1.6} fill="none" /></>;
    case "label": return disc(20, 22, 13);
    case "stack": return <><rect x={15} y={8} width={16} height={16} fill={fg} opacity={0.5} /><rect x={11} y={12} width={16} height={16} fill={fg} opacity={0.75} /><rect x={7} y={16} width={16} height={16} fill="#0f0f10" /></>;
    case "sticker": return <><circle cx={27} cy={14} r={8} fill={fg} />{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={7 + i * 3.4} y={26} width={1.6 + (i % 3)} height={8} fill={fg} />)}</>;
    case "waveform": return <>{[6, 10, 14, 9, 16, 12, 7, 11].map((h, i) => <rect key={i} x={6 + i * 3.6} y={34 - h} width={2.4} height={h} fill={fg} />)}</>;
    case "dots": return <>{[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <circle key={i} cx={10 + (i % 3) * 10} cy={12 + Math.floor(i / 3) * 10} r={1.5 + ((i * 5) % 4)} fill={fg} />)}</>;
    case "mosaic": return <>{[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <rect key={i} x={7 + (i % 3) * 9} y={9 + Math.floor(i / 3) * 9} width={8} height={8} fill={fg} opacity={0.45 + (i % 3) * 0.2} />)}</>;
    case "cover": return <rect x={8} y={9} width={24} height={24} fill={fg} opacity={0.7} />;
  }
}

export function VisualTiles({ value, onChange, ink }: { value: CardVisual; onChange: (v: CardVisual) => void; ink: InkId }) {
  const bg = inkHex(ink);
  const fg = inkText(bg);
  return (
    <RadioGroup aria-label="Visual" value={value} onValueChange={(v) => onChange(v as CardVisual)}
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-2 [scrollbar-width:thin]">
      {VISUALS.map((visual) => (
        <Radio.Root key={visual} value={visual}
          className="group/tile relative flex w-[4.5rem] shrink-0 cursor-pointer flex-col items-center gap-1 outline-none focus-visible:[&>svg]:ring-2 focus-visible:[&>svg]:ring-text">
          <svg viewBox="0 0 40 50" aria-hidden="true"
            className="aspect-[4/5] w-full ring-offset-2 ring-offset-ground transition-transform duration-150 group-hover/tile:-translate-y-0.5 group-data-[checked]/tile:ring-2 group-data-[checked]/tile:ring-text"
            style={{ background: bg }}>
            <Shape visual={visual} fg={fg} />
          </svg>
          <span className="text-xs font-semibold">{VISUAL_LABELS[visual]}</span>
          <Radio.Indicator className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-text text-ground">
            <Check className="size-3" aria-hidden="true" />
          </Radio.Indicator>
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
