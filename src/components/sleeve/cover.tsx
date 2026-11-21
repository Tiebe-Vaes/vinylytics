import { hashInk, inkHex, inkText } from "@/lib/ink";
import { cn } from "@/lib/utils";

const initials = (name: string) => name.replace(/^the\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/**
 * A Spotify cover, shown the way Spotify's guidelines ask: unaltered (no
 * filter, blend or crop), small, like a sticker on the shrink-wrap. Without
 * art: a small record whose label takes the item's own ink, or, at hero size,
 * an ink tile with initials, so a list of unknowns doesn't read as broken images.
 */
export function Cover({
  url,
  size = 48,
  alt,
  seed,
  className,
}: {
  url: string | null | undefined;
  size?: number;
  alt: string;
  /** What picks the placeholder's ink; defaults to `alt`. */
  seed?: string;
  className?: string;
}) {
  const box = { width: size, height: size };
  if (!url) {
    const ink = inkHex(hashInk(seed || alt || "vinylytics"));
    if (size >= 96) {
      return (
        <span role="img" aria-label={alt} style={{ ...box, background: ink, color: inkText(ink), fontSize: size * 0.36 }}
          className={cn("display flex shrink-0 items-center justify-center ring-2 ring-text", className)}>
          <span aria-hidden>{initials(seed || alt) || "♪"}</span>
        </span>
      );
    }
    return (
      <span role="img" aria-label={alt} style={{ ...box, background: "repeating-radial-gradient(circle, #0f0f10 0 2px, #2a2826 2px 3px)" }}
        className={cn("relative shrink-0 rounded-full", className)}>
        <span aria-hidden className="absolute inset-[32%] rounded-full" style={{ background: ink }} />
        <span aria-hidden className="absolute inset-[47%] rounded-full bg-ground" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- hotlinked Spotify CDN art, shown unaltered
    <img
      src={url}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      style={box}
      className={cn("shrink-0 bg-ground object-contain ring-2 ring-text", className)}
    />
  );
}
