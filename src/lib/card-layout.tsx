import { inkHex, inkText, type InkId } from "@/lib/ink";
import { CARD_SIZES, cardOptions, type CardKind, type CardVisual } from "@/lib/card-options";
import { SITE_URL } from "@/lib/site";
import { CardVisualBox } from "@/lib/card-visual";

/**
 * The share card's layout, shared by both renderers: next/og on the server
 * (lib/card.tsx) and satori + resvg in the browser build (browser/card.tsx).
 */

export type CardFont = { name: string; data: ArrayBuffer; weight: 400 | 600 | 900; style: "normal" };

/** Satori reads TTF/OTF/WOFF, not WOFF2, so the faces are the @fontsource .woff files. */
export const CARD_FONT_FILES: [string, string, CardFont["weight"]][] = [
  ["Big Shoulders", "@fontsource/big-shoulders/files/big-shoulders-latin-900-normal.woff", 900],
  ["Archivo", "@fontsource/archivo/files/archivo-latin-400-normal.woff", 400],
  ["Archivo", "@fontsource/archivo/files/archivo-latin-600-normal.woff", 600],
];

/**
 * Font size for an era name on a card. Names run up to 80 characters and
 * Satori doesn't shrink-to-fit, so step the size down by length.
 */
export function eraTitleSize(name: string, story: boolean): number {
  const n = name.length;
  const base = n <= 16 ? 120 : n <= 28 ? 96 : n <= 44 ? 72 : 56;
  return story ? Math.round(base * 1.25) : base;
}

export type CardContent = {
  kind: CardKind;
  ink: InkId;
  edition: string;
  title: string;
  period: string;
  lead?: string | null;
  cover?: string | null;
  stat?: string;
  rows?: { label: string; value?: string; fraction?: number }[];
  ranked?: boolean;
  /** Weekly, monthly or ranked values that shape the visual. */
  series?: number[];
  /** Data-URI covers in rank order for the mosaic visual; null where an item has no art. */
  covers?: (string | null)[];
  /** Short hero text for the sticker and label visuals, with a small caption under it. */
  badge?: string;
  caption?: string;
  /** This card's own default visual, when it differs from its kind's. */
  visual?: CardVisual;
  /** Demo history: the footer says so instead of crediting Spotify. Set by the renderer, not the route. */
  demo?: boolean;
};

export type CardOptions = ReturnType<typeof cardOptions>;
/** A photo already cropped to the card and blended with its background colour, used as the card's background. */
export type CardPhoto = { src: string };

/** Background style for a card, with the photo when there is one. Satori shifts the layout around an
 * absolutely placed image, so the photo is a background, not an element. */
export function cardBackground(bg: string, size: { width: number; height: number }, photo?: CardPhoto | null) {
  return photo ? { backgroundColor: bg, backgroundImage: `url(${photo.src})`, backgroundSize: `${size.width}px ${size.height}px` } : { background: bg };
}

/** The card's sign-off: where to get your own, plus the data credit Spotify's terms ask for. */
export function cardFooter(demo: boolean) {
  return { site: SITE_URL, attribution: demo ? "Synthetic demo history" : "Data from Spotify" };
}

/** Whether this request's card shows the cover, so renderers only fetch art when it is drawn. */
export function cardWantsCover(req: Request, card: CardContent): boolean {
  return cardOptions(new URL(req.url).searchParams, card.kind, card.ink, card.visual).fields.includes("cover");
}

/** The sign-off row every card ends with: the Vinylytics mark, the site and the data credit. */
export function footerBar(fg: string, bg: string, demo: boolean) {
  const footer = cardFooter(demo);
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <svg width={44} height={44} viewBox="0 0 44 44">
          <circle cx={22} cy={22} r={21} fill={fg} />
          <circle cx={22} cy={22} r={14} fill="none" stroke={bg} strokeWidth={1.5} opacity={0.5} />
          <circle cx={22} cy={22} r={7} fill={bg} />
          <circle cx={22} cy={22} r={2} fill={fg} />
        </svg>
        <span style={{ ...display, fontSize: 38 }}>VINYLYTICS</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <span style={{ fontSize: 28, fontWeight: 600 }}>{footer.site}</span>
        <span style={{ fontSize: 17, opacity: 0.7 }}>{footer.attribution}</span>
      </div>
    </div>
  );
}

export const display = { fontFamily: "Big Shoulders", fontWeight: 900 as const, textTransform: "uppercase" as const };
export const singleLine = { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" } as const;

/** The card element and its pixel size for this request's options. `artwork` is a data URI or null. */
export function cardLayout(req: Request, card: CardContent, artwork: string | null, photo?: CardPhoto | null) {
  return cardElement(card, artwork, cardOptions(new URL(req.url).searchParams, card.kind, card.ink, card.visual), photo);
}

/** The same card for any options: the PNG renderers and the recap deck (drawn in the page) share it. */
export function cardElement(card: CardContent, artwork: string | null, options: CardOptions, photo?: CardPhoto | null) {
  const { format, ink, fields, visual } = options;
  const story = format === "story";
  const bg = inkHex(ink);
  const fg = inkText(bg);
  const rows = fields.includes("rows") ? (card.rows ?? []).slice(0, 5) : [];
  const coverSize = rows.length ? (story ? 500 : 274) : (story ? 760 : 552);
  const title = card.title.trim() || "Untitled";
  const hasVisual = visual !== "cover" || artwork !== null;
  const fontSize = Math.round(eraTitleSize(title, story) * (!hasVisual && !rows.length ? 1.45 : 1));

  const size = CARD_SIZES[format];
  // A recap stat reads as a sentence: "This year you listened for" / "10,656 minutes".
  const leadFirst = card.kind === "recap";
  const element = (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", padding: story ? "250px 64px 340px" : 64, boxSizing: "border-box", width: "100%", height: "100%", ...cardBackground(bg, size, photo), color: fg, fontFamily: "Archivo" }}>
      {fields.includes("period") && <span style={{ position: "relative", fontSize: 29, fontWeight: 600 }}>{card.period}</span>}
      {/* Centred like a record sleeve; a ranked list reads better left-aligned. */}
      {/* Positioned, so it paints above the absolutely placed photo. */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: story ? 28 : 18,
        ...(rows.length ? {} : { alignItems: "center", textAlign: "center" as const }) }}>
        {hasVisual && (
          <CardVisualBox visual={visual} size={coverSize} ink={ink} series={card.series} artwork={artwork}
            badge={card.badge} caption={card.caption} covers={card.covers} edition={card.edition.replace(/\s+\/\s+/, " / ")} />
        )}
        {fields.includes("lead") && card.lead && leadFirst && <span style={{ ...singleLine, fontSize: 37, fontWeight: 600 }}>{card.lead}</span>}
        <div style={{ ...display, display: "flex", justifyContent: rows.length ? "flex-start" : "center", fontSize, lineHeight: 0.99, maxWidth: 948, wordBreak: "break-word", ...(card.kind === "era" ? {} : { lineClamp: 4 }) }}>{title}</div>
        {fields.includes("lead") && card.lead && !leadFirst && <span style={{ ...singleLine, fontSize: 37, fontWeight: 600 }}>{card.lead}</span>}
        {fields.includes("stat") && card.stat && <span style={{ ...display, fontSize: story ? 78 : 62 }}>{card.stat}</span>}
        {rows.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: story ? 18 : 12, marginTop: 8 }}>
            {rows.map((row, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {card.ranked && <span style={{ ...display, width: 42, fontSize: 39 }}>{i + 1}</span>}
                  <span style={{ ...singleLine, flex: 1, fontWeight: 600, fontSize: 34 }}>{row.label}</span>
                  {row.value && <span style={{ ...singleLine, maxWidth: 470, fontSize: 32 }}>{row.value}</span>}
                </div>
                {row.fraction != null && <div style={{ width: `${Math.max(0, Math.min(1, row.fraction)) * 100}%`, height: 5, background: fg, opacity: 0.85 }} />}
              </div>
            ))}
          </div>
        )}
      </div>
      {footerBar(fg, bg, Boolean(card.demo))}
    </div>
  );
  return { element, size };
}
