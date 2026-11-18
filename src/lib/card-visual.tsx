import { inkHex, inkText, type InkId } from "@/lib/ink";
import type { CardVisual } from "@/lib/card-options";

/**
 * The one visual element on a share card. Shapes are SVG in a 100×100 box;
 * text and cover art sit on top as HTML, because Satori draws SVG text without
 * the card fonts. Data-driven motifs read `series` (weeks, months or ranks).
 */

const RECORD = "#0f0f10";
const GROOVE = "#2a2826";
/** A second ink that reads well next to each card ink. */
const PARTNER: Record<InkId, InkId> = {
  cobalt: "mustard", vermilion: "teal", mustard: "vermilion", green: "mustard",
  plum: "orange", teal: "orange", orange: "cobalt", redviolet: "mustard",
};
const STACK: Record<InkId, [InkId, InkId]> = {
  cobalt: ["mustard", "vermilion"], vermilion: ["mustard", "teal"], mustard: ["plum", "green"], green: ["mustard", "redviolet"],
  plum: ["orange", "teal"], teal: ["mustard", "orange"], orange: ["cobalt", "green"], redviolet: ["mustard", "teal"],
};

/** Averages `values` into `n` buckets and scales them to 0–1. No data yields a gentle curve rather than an empty card. */
export function shape(values: number[] | undefined, n: number): number[] {
  const src = values?.length ? values : Array.from({ length: n }, (_, i) => 0.35 + 0.5 * Math.sin((i / Math.max(1, n - 1)) * Math.PI));
  const buckets = Math.min(n, src.length);
  const out = Array.from({ length: buckets }, (_, i) => {
    const from = Math.floor((i * src.length) / buckets), to = Math.max(from + 1, Math.floor(((i + 1) * src.length) / buckets));
    const part = src.slice(from, to);
    return part.reduce((s, v) => s + v, 0) / part.length;
  });
  const max = Math.max(...out, 0);
  return out.map((v) => (max > 0 ? Math.max(0, v) / max : 0));
}

/** `hex` darkened toward black by `amount` (0–1). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - amount)));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

type Props = {
  visual: CardVisual; size: number; ink: InkId; series?: number[];
  artwork: string | null; badge?: string; caption?: string; edition: string;
};

const display = { fontFamily: "Big Shoulders", fontWeight: 900 as const, textTransform: "uppercase" as const };

/** A record seen from above; `label` is a fill colour, and the cover replaces it when there is art.
 * A plain function, not a component: Satori serialises SVG children without rendering components. */
function record(cx: number, cy: number, r: number, series: number[], label: string, hole: string) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={RECORD} />
      {series.map((v, i) => (
        <circle key={i} cx={cx} cy={cy} r={r * (0.92 - (i * 0.5) / series.length)} fill="none" stroke={GROOVE} strokeWidth={0.25 + v * 0.9} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.34} fill={label} />
      <circle cx={cx} cy={cy} r={r * 0.04} fill={hole} />
    </g>
  );
}

/** Cover art clipped into the record label, positioned in the 100-unit box. */
function LabelArt({ src, cx, cy, r, size }: { src: string | null; cx: number; cy: number; r: number; size: number }) {
  if (!src) return null;
  const d = (r * 2 * size) / 100;
  // eslint-disable-next-line @next/next/no-img-element -- Satori renders an embedded image into the PNG.
  return <img src={src} alt="" width={d} height={d} style={{ position: "absolute", left: ((cx - r) * size) / 100, top: ((cy - r) * size) / 100, borderRadius: d / 2, objectFit: "cover" }} />;
}

export function CardVisualBox({ visual, size, ink, series, artwork, badge, caption, edition }: Props) {
  const bg = inkHex(ink);
  const fg = inkText(bg);
  const accent = inkHex(PARTNER[ink]);
  const box = { position: "relative" as const, display: "flex", width: size, height: size, alignSelf: "flex-end" as const };
  const svg = (children: React.ReactNode) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute", left: 0, top: 0 }}>{children}</svg>
  );

  if (visual === "cover") {
    if (!artwork) return null;
    // eslint-disable-next-line @next/next/no-img-element -- Satori renders an embedded image into the PNG.
    return <img src={artwork} alt="" width={size} height={size} style={{ objectFit: "contain", alignSelf: "flex-end" }} />;
  }

  if (visual === "sleeve") {
    const rings = shape(series, 10);
    return (
      <div style={box}>
        {svg(<>
          {record(62, 50, 36, rings, accent, bg)}
          <rect x={2} y={12} width={60} height={76} fill={shade(bg, 0.32)} />
          <rect x={8} y={18} width={48} height={1.2} fill={fg} opacity={0.7} />
          <rect x={8} y={80} width={48} height={0.6} fill={fg} opacity={0.7} />
        </>)}
        <LabelArt src={artwork} cx={62} cy={50} r={36 * 0.34} size={size} />
      </div>
    );
  }

  if (visual === "grooves") {
    const rings = shape(series, 12);
    return (
      <div style={box}>
        {svg(<>
          {rings.map((v, i) => (
            <circle key={i} cx={50} cy={50} r={47 - (i * 31) / rings.length} fill="none" stroke={fg} strokeWidth={0.3 + v * 1.3} opacity={0.3 + v * 0.7} />
          ))}
          <circle cx={50} cy={50} r={13} fill={fg} />
          <circle cx={50} cy={50} r={1.4} fill={bg} />
        </>)}
        <LabelArt src={artwork} cx={50} cy={50} r={13} size={size} />
      </div>
    );
  }

  if (visual === "turntable") {
    const rings = shape(series, 10);
    return (
      <div style={box}>
        {svg(<>
          {record(44, 54, 42, rings, accent, bg)}
          <circle cx={90} cy={12} r={5} fill={fg} />
          <path d="M90 12 L82 62 L66 72" stroke={fg} strokeWidth={2.2} fill="none" strokeLinejoin="round" />
          <rect x={60} y={68} width={10} height={6} fill={fg} transform="rotate(-30 65 71)" />
        </>)}
        <LabelArt src={artwork} cx={44} cy={54} r={42 * 0.34} size={size} />
      </div>
    );
  }

  if (visual === "label") {
    const text = inkText(accent);
    return (
      <div style={box}>
        {svg(<>
          <circle cx={50} cy={50} r={48} fill={RECORD} />
          <circle cx={50} cy={50} r={44} fill="none" stroke={GROOVE} strokeWidth={0.6} />
          <circle cx={50} cy={50} r={38} fill="none" stroke={GROOVE} strokeWidth={1.2} />
          <circle cx={50} cy={50} r={30} fill={accent} />
          <circle cx={50} cy={50} r={1.6} fill={bg} />
        </>)}
        <div style={{ position: "absolute", left: size * 0.22, top: size * 0.27, width: size * 0.56, display: "flex", justifyContent: "center", color: text, fontSize: Math.max(12, size * 0.036), fontWeight: 600 }}>{edition}</div>
        {badge && <div style={{ ...display, position: "absolute", left: size * 0.2, top: size * 0.53, width: size * 0.6, display: "flex", justifyContent: "center", color: text, fontSize: size * 0.1 }}>{badge}</div>}
        {caption && <div style={{ position: "absolute", left: size * 0.22, top: size * 0.65, width: size * 0.56, display: "flex", justifyContent: "center", color: text, fontSize: Math.max(12, size * 0.032), fontWeight: 600 }}>{caption}</div>}
      </div>
    );
  }

  if (visual === "stack") {
    const [a, b] = STACK[ink].map(inkHex);
    return (
      <div style={box}>
        {svg(<>
          <rect x={40} y={4} width={56} height={56} fill={a} />
          <rect x={28} y={16} width={56} height={56} fill={b} />
          <rect x={16} y={28} width={56} height={56} fill={RECORD} />
          <circle cx={44} cy={56} r={20} fill="none" stroke={GROOVE} strokeWidth={1.2} />
          <circle cx={44} cy={56} r={13} fill="none" stroke={GROOVE} strokeWidth={0.6} />
          <circle cx={44} cy={56} r={6} fill={fg} />
        </>)}
        {artwork && (
          // eslint-disable-next-line @next/next/no-img-element -- Satori renders an embedded image into the PNG.
          <img src={artwork} alt="" width={size * 0.56} height={size * 0.56} style={{ position: "absolute", left: size * 0.16, top: size * 0.28, objectFit: "cover" }} />
        )}
      </div>
    );
  }

  if (visual === "sticker") {
    const raw = shape(series, 30);
    // A barcode needs density: stretch short series (a top five) across 30 bars with a fixed rhythm.
    const bars = raw.length >= 12 ? raw : Array.from({ length: 30 }, (_, i) => raw[Math.floor((i * raw.length) / 30)] * (0.45 + 0.55 * (((i * 7) % 5) / 4)));
    const step = 92 / bars.length;
    const text = inkText(accent);
    return (
      <div style={box}>
        {svg(bars.map((v, i) => <rect key={i} x={4 + i * step} y={62} width={Math.max(0.5, step * (0.25 + v * 0.65))} height={30} fill={fg} />))}
        <div style={{ position: "absolute", left: size * 0.46, top: size * 0.02, width: size * 0.48, height: size * 0.48, borderRadius: size, background: accent, color: text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "rotate(-12deg)" }}>
          <span style={{ ...display, fontSize: size * 0.11, lineHeight: 1 }}>{badge ?? "TOP"}</span>
          {caption && <span style={{ fontSize: Math.max(13, size * 0.034), fontWeight: 600, marginTop: size * 0.012, textAlign: "center" }}>{caption}</span>}
        </div>
      </div>
    );
  }

  if (visual === "waveform") {
    const bars = shape(series, 26);
    const step = 92 / bars.length;
    return <div style={box}>{svg(bars.map((v, i) => {
      const h = 6 + v * 82;
      return <rect key={i} x={4 + i * step} y={96 - h} width={step * 0.68} height={h} fill={fg} />;
    }))}</div>;
  }

  // dots: one per bucket in a roughly 3:2 grid, sized by value.
  const dots = shape(series, 52);
  const cols = Math.min(dots.length, Math.max(4, Math.ceil(Math.sqrt(dots.length * 1.6))));
  const gap = 92 / cols;
  const top = 50 - (Math.ceil(dots.length / cols) * gap) / 2 + gap / 2;
  return <div style={box}>{svg(dots.map((v, i) => (
    <circle key={i} cx={4 + gap / 2 + (i % cols) * gap} cy={top + Math.floor(i / cols) * gap} r={0.8 + v * gap * 0.42} fill={fg} opacity={0.35 + v * 0.65} />
  )))}</div>;
}
