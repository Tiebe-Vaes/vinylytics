/**
 * Where a background photo lands on a card. The photo always covers the card;
 * `fx`/`fy` (0–1) pick which part shows, `zoom` (≥ 1) enlarges it further.
 */
export function photoRect(iw: number, ih: number, W: number, H: number, fx: number, fy: number, zoom: number) {
  const scale = Math.max(W / iw, H / ih) * zoom;
  const dw = Math.round(iw * scale);
  const dh = Math.round(ih * scale);
  // `+ 0` turns -0 into 0.
  return { dx: Math.round((W - dw) * fx) + 0, dy: Math.round((H - dh) * fy) + 0, dw, dh };
}

/** A new focus after dragging the preview by `delta` px; dragging right reveals more of the left side. */
export function dragFocus(focus: number, delta: number, previewSize: number, cardSize: number, drawnSize: number): number {
  const slack = drawnSize - cardSize;
  if (slack <= 0) return focus;
  return Math.min(1, Math.max(0, focus - (delta * cardSize) / previewSize / slack));
}

/** The photo cropped to the card and laid over `bg` at `opacity`, as a JPEG data URI for the card's background. */
export function cropPhoto(image: HTMLImageElement, W: number, H: number, fx: number, fy: number, zoom: number, bg: string, opacity: number): string {
  const canvas = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const { dx, dy, dw, dh } = photoRect(image.naturalWidth, image.naturalHeight, W, H, fx, fy, zoom);
  const g = canvas.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = opacity;
  g.drawImage(image, dx, dy, dw, dh);
  return canvas.toDataURL("image/jpeg", 0.88);
}
