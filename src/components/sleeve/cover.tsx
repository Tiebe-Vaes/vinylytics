import { Disc3 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A Spotify cover, shown the way Spotify's guidelines ask: unaltered (no
 * filter, blend or crop), small, like a sticker on the shrink-wrap.
 */
export function Cover({
  url,
  size = 48,
  alt,
  className,
}: {
  url: string | null | undefined;
  size?: number;
  alt: string;
  className?: string;
}) {
  const box = { width: size, height: size };
  if (!url) {
    return (
      <span
        role="img"
        aria-label={alt}
        style={box}
        className={cn("flex shrink-0 items-center justify-center bg-ground text-muted-text ring-2 ring-text", className)}
      >
        <Disc3 className="size-1/2" strokeWidth={1.5} />
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
