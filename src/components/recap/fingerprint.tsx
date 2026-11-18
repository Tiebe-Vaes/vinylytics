import { inkHex, inkText, type InkId } from "@/lib/ink";

/**
 * A listening week as a record: seven rings (Monday outermost) cut into 24 hour
 * spokes, each groove as thick as the minutes in it. Same data, same picture.
 */
export function Fingerprint({ grid, ink, size = 240, label }: { grid: number[][]; ink: InkId; size?: number; label: string }) {
  const bg = inkHex(ink);
  const fg = inkText(bg);
  const max = Math.max(1, ...grid.flat());
  const arc = (r: number, a0: number, a1: number) => {
    const p = (a: number) => `${50 + r * Math.sin(a)} ${50 - r * Math.cos(a)}`;
    return `M ${p(a0)} A ${r} ${r} 0 0 1 ${p(a1)}`;
  };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={label}>
      <circle cx={50} cy={50} r={49} fill={bg} />
      {grid.map((row, day) => row.map((v, hour) => v > 0 && (
        <path key={`${day}-${hour}`} d={arc(44 - day * 4.6, (hour / 24) * 2 * Math.PI + 0.02, ((hour + 1) / 24) * 2 * Math.PI - 0.02)}
          fill="none" stroke={fg} strokeLinecap="round" strokeWidth={0.4 + (v / max) * 3.4} opacity={0.35 + (v / max) * 0.65} />
      )))}
      <circle cx={50} cy={50} r={9} fill={fg} />
      <circle cx={50} cy={50} r={1.4} fill={bg} />
    </svg>
  );
}
