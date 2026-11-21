"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ImagePlus, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** A background photo: `x`/`y` pick the part that shows (0–1), `zoom` ≥ 1, `opacity` 0.1–0.9. Lives only in this tab. */
export type Photo = { key: string; image: HTMLImageElement; x: number; y: number; zoom: number; opacity: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function load(src: string, cors: boolean): Promise<HTMLImageElement> {
  const image = new Image();
  if (cors) image.crossOrigin = "anonymous";
  image.src = src;
  return image.decode().then(() => image);
}

/**
 * Pick a photo from this device (or use the artist's artwork) to sit behind the
 * card's text. Drag the preview or use the arrow buttons to move it.
 */
export function PhotoControl({ photo, onChange, coverOf }: {
  photo: Photo | null; onChange: (p: Photo | null) => void; coverOf: () => Promise<string | null>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const opacityId = useId();
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);

  async function pick(src: string, cors: boolean, key: string) {
    setBusy(true);
    setError(null);
    try {
      const image = await load(src, cors);
      onChange({ key, image, x: 0.5, y: 0.5, zoom: 1, opacity: photo?.opacity ?? 0.35 });
    } catch {
      setError(cors ? "This artwork can’t be used as a photo. Pick one from your device." : "That file isn’t an image this browser can open.");
    } finally {
      setBusy(false);
    }
  }

  async function fromFile(file: File | undefined) {
    if (!file) return;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    await pick(objectUrl.current, false, `file-${file.name}-${file.size}`);
  }

  async function fromCover() {
    const cover = await coverOf().catch(() => null);
    if (!cover) return setError("This card has no artwork to use.");
    await pick(cover, true, `cover-${cover}`);
  }

  const move = (dx: number, dy: number) => photo && onChange({ ...photo, x: clamp(photo.x + dx, 0, 1), y: clamp(photo.y + dy, 0, 1) });
  const zoom = (d: number) => photo && onChange({ ...photo, zoom: clamp(photo.zoom + d, 1, 3) });
  const small = "size-11";

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 font-semibold">Photo</legend>
      <p className="text-xs text-muted-text">Your photo stays on this device. The card is drawn right here.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => input.current?.click()}><ImagePlus aria-hidden="true" />{photo ? "Change photo" : "Add photo"}</Button>
        <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => void fromCover()}>Use artwork</Button>
        {photo && <Button type="button" variant="ghost" className="min-h-11" onClick={() => onChange(null)}><Trash2 aria-hidden="true" />Remove</Button>}
      </div>
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Photo file"
        onChange={(e) => { void fromFile(e.target.files?.[0]); e.target.value = ""; }} />
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      {photo && (
        <>
          <label htmlFor={opacityId} className="mt-1 flex items-center justify-between text-sm">
            <span>Photo strength</span><span className="nums text-muted-text">{Math.round(photo.opacity * 100)}%</span>
          </label>
          {/* Commits on release, so the card redraws once instead of on every step. */}
          <input id={opacityId} type="range" min={10} max={90} step={5} defaultValue={Math.round(photo.opacity * 100)} key={photo.key}
            className="h-11 accent-[var(--text)]"
            onPointerUp={(e) => onChange({ ...photo, opacity: Number(e.currentTarget.value) / 100 })}
            onKeyUp={(e) => onChange({ ...photo, opacity: Number(e.currentTarget.value) / 100 })} />
          <p className="text-xs text-muted-text">Drag the preview to move the photo, or use the buttons.</p>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Move and zoom the photo">
            <Button type="button" variant="outline" className={small} aria-label="Show more of the left" onClick={() => move(-0.1, 0)}><ArrowLeft aria-hidden="true" /></Button>
            <Button type="button" variant="outline" className={small} aria-label="Show more of the right" onClick={() => move(0.1, 0)}><ArrowRight aria-hidden="true" /></Button>
            <Button type="button" variant="outline" className={small} aria-label="Show more of the top" onClick={() => move(0, -0.1)}><ArrowUp aria-hidden="true" /></Button>
            <Button type="button" variant="outline" className={small} aria-label="Show more of the bottom" onClick={() => move(0, 0.1)}><ArrowDown aria-hidden="true" /></Button>
            <Button type="button" variant="outline" className={small} aria-label="Zoom out" disabled={photo.zoom <= 1} onClick={() => zoom(-0.25)}><Minus aria-hidden="true" /></Button>
            <Button type="button" variant="outline" className={small} aria-label="Zoom in" disabled={photo.zoom >= 3} onClick={() => zoom(0.25)}><Plus aria-hidden="true" /></Button>
          </div>
        </>
      )}
    </fieldset>
  );
}
