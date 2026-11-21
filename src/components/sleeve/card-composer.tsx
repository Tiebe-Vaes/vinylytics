"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, Share, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CARD_SIZES, FIELDS, cardOptions, presetFields, type CardFormat, type CardKind, type Density } from "@/lib/card-options";
import { MAX_COMBO, specBackground, specOptions, type CardSpec } from "@/lib/card-spec";
import { cropPhoto, dragFocus, photoRect } from "@/lib/photo-crop";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import { VinylLoader } from "@/components/vinyl-loader";
import type { ShareButtonProps } from "./share-button";
import { VisualTiles } from "./visual-tiles";
import { previewState, type Rendered } from "./preview-gate";
import { InkPicker } from "./ink-picker";
import { DensitySlider } from "./density-slider";
import { FieldToggles } from "./field-toggles";
import { PhotoControl, type Photo } from "./photo-control";

const choice = "min-h-11 border border-strong px-3 text-sm font-semibold capitalize aria-pressed:bg-text aria-pressed:text-ground";

/** A photo card is drawn in this tab from the card's data, so the photo itself never leaves the device. */
async function renderWithPhoto(src: string, photo: Photo, signal: AbortSignal): Promise<Blob> {
  const url = new URL(src, "https://vinylytics.invalid");
  url.searchParams.set("as", "json");
  const response = await apiFetch(url.pathname + url.search, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Card data unavailable");
  const spec = (await response.json()) as CardSpec;
  const { specPng, dataUri } = await import("@/lib/card-client");
  const options = specOptions(url.searchParams, spec);
  const artwork = spec.type === "content" && options.fields.includes("cover") ? await dataUri(spec.card.cover) : null;
  const { width, height } = CARD_SIZES[options.format];
  return specPng(spec, artwork, options, { src: cropPhoto(photo.image, width, height, photo.x, photo.y, photo.zoom, specBackground(spec, options), photo.opacity) });
}

export default function CardComposer({ href, filename, title = "Share card", defaultInk = "cobalt", scope, preview, combo, onClose }: ShareButtonProps & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const base = new URL(href, "https://vinylytics.invalid");
  const kind = base.pathname.split("/")[3] as CardKind;
  const [options, updateOptions] = useState(() => cardOptions(base.searchParams, kind, defaultInk));
  const [customise, setCustomise] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Rendered | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [shareError, setShareError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [comboIds, setComboIds] = useState<string[]>(() => (combo ? [combo.first] : []));
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [drag, setDrag] = useState<{ x0: number; y0: number; dx: number; dy: number } | null>(null);
  // Confirmation lives in the dialog: a toast would sit behind the modal's top layer.
  const [done, setDone] = useState<string | null>(null);
  if (comboIds.length > 1) {
    base.searchParams.delete("slide");
    base.searchParams.set("slides", comboIds.join(","));
  }
  // Combos and the poster have their own layout; visual and facts don't apply to them.
  const ownLayout = comboIds.length > 1 || base.searchParams.get("slide") === "poster";
  base.searchParams.set("visual", options.visual);
  base.searchParams.set("format", options.format);
  base.searchParams.set("ink", options.ink);
  base.searchParams.set("density", options.density);
  base.searchParams.set("fields", options.fields.join(","));
  const cardSrc = base.pathname + base.search;
  // The photo is part of what's on screen, so it is part of the preview's identity.
  const src = photo ? `${cardSrc}#photo=${photo.key}-${photo.x.toFixed(3)}-${photo.y.toFixed(3)}-${photo.zoom}-${photo.opacity}` : cardSrc;
  const downloadName = filename.replace(/\.png$/i, "") + (options.format === "story" ? "-story.png" : ".png");
  // A changed URL immediately invalidates the previous file, including before effects run.
  // The old image stays on screen, dimmed, until the new one is ready.
  const { ready, error } = previewState(result, src, failed);
  const latest = useRef<string | null>(null);

  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => { el?.close(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function generate() {
      try {
        let blob: Blob;
        if (photo) {
          blob = await renderWithPhoto(cardSrc, photo, controller.signal);
        } else {
          const response = await apiFetch(cardSrc, { signal: controller.signal, cache: "no-store" });
          if (!response.ok || !response.headers.get("content-type")?.startsWith("image/png")) throw new Error("PNG unavailable");
          blob = await response.blob();
        }
        if (controller.signal.aborted) return;
        const objectUrl = URL.createObjectURL(blob);
        const image = new Image();
        image.src = objectUrl;
        try { await image.decode(); } catch (error) { URL.revokeObjectURL(objectUrl); throw error; }
        if (controller.signal.aborted) { URL.revokeObjectURL(objectUrl); return; }
        const file = typeof File === "undefined" ? null : new File([blob], downloadName, { type: "image/png" });
        let canShare = false;
        try { canShare = Boolean(file && navigator.canShare?.({ files: [file] })); } catch { /* Save PNG stays available. */ }
        // Revoke the replaced preview only once the new one is in place.
        if (latest.current) URL.revokeObjectURL(latest.current);
        latest.current = objectUrl;
        setResult({ src, objectUrl, file, canShare });
        setFailed(null);
        setShareError(false);
      } catch {
        if (!controller.signal.aborted) setFailed(src);
      }
    }
    void generate();
    return () => controller.abort();
    // `src` already covers every photo field; the photo object itself is read inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, attempt, downloadName]);

  useEffect(() => () => { if (latest.current) URL.revokeObjectURL(latest.current); }, []);

  async function share() {
    if (!ready?.file) return;
    setSharing(true);
    setShareError(false);
    try { await navigator.share({ title, files: [ready.file] }); setDone("Shared"); }
    catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setShareError(true); }
    finally { setSharing(false); }
  }

  function save() {
    if (!ready) return;
    Object.assign(document.createElement("a"), { href: ready.objectUrl, download: downloadName }).click();
    setDone("Card saved");
  }

  function dismiss() {
    // Release the native modal's focus trap before the trigger takes focus.
    dialog.current?.close();
    onClose();
  }

  function reset() {
    setDone(null);
    setFailed(null);
    setShareError(false);
  }

  // Patches apply to the latest options, so quick taps in one frame all land.
  function setOptions(patch: (o: typeof options) => Partial<typeof options>) {
    reset();
    updateOptions((o) => {
      const next = { ...o, ...patch(o) };
      const same = next.visual === o.visual && next.ink === o.ink && next.format === o.format && next.density === o.density &&
        next.fields.join(",") === o.fields.join(",");
      return same ? o : next;
    });
  }

  function changePhoto(next: Photo | null) {
    reset();
    setPhoto(next);
  }

  function setDensity(density: Density) {
    setOptions(() => ({ density, fields: presetFields(kind, density) }));
  }

  // Dragging the preview moves the photo; the card redraws once on release.
  function endDrag(el: HTMLElement) {
    if (!photo || !drag) return setDrag(null);
    const { width: W, height: H } = CARD_SIZES[options.format];
    const r = photoRect(photo.image.naturalWidth, photo.image.naturalHeight, W, H, photo.x, photo.y, photo.zoom);
    const box = el.getBoundingClientRect();
    setDrag(null);
    if (Math.abs(drag.dx) + Math.abs(drag.dy) < 3) return;
    changePhoto({ ...photo, x: dragFocus(photo.x, drag.dx, box.width, W, r.dw), y: dragFocus(photo.y, drag.dy, box.height, H, r.dh) });
  }

  const size = CARD_SIZES[options.format];
  const ratio = options.format === "story" ? "9 / 16" : "4 / 5";
  return (
    <dialog ref={dialog} aria-labelledby={headingId} onCancel={(event) => { event.preventDefault(); event.stopPropagation(); dismiss(); }}
      className="fixed inset-0 m-auto max-h-[94dvh] w-[min(95vw,48rem)] overflow-y-auto overscroll-contain border border-strong bg-ground p-0 text-text backdrop:bg-black/80">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-rule bg-ground px-4 py-2">
        <h2 id={headingId} className="min-w-0 text-lg font-semibold break-words">{comboIds.length > 1 ? `${comboIds.length} cards in one` : title}</h2>
        <Button variant="ghost" className="size-11" aria-label="Close preview" onClick={dismiss}><X aria-hidden="true" /></Button>
      </header>
      <div className={cn("p-4", customise && "md:grid md:grid-cols-[1fr_1fr] md:items-start md:gap-6")}>
        <div className="flex flex-col items-center">
          <div aria-busy={!ready && !error} className="grid w-full place-items-center overflow-hidden bg-raised p-2">
            {/* Sized by width, capped by height: a fixed height let the 4:5 box grow wider than a phone's dialog. */}
            <div className={cn("relative grid place-items-center", options.format === "story" ? "aspect-[9/16]" : "aspect-[4/5]",
              customise ? "max-h-[30dvh] md:max-h-[60dvh]" : "max-h-[58dvh]", photo && "cursor-grab touch-none active:cursor-grabbing")}
              style={{ width: `min(100%, calc(${customise ? "30dvh" : "58dvh"} * ${ratio}))` }}
              onPointerDown={photo ? (e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag({ x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 }); } : undefined}
              onPointerMove={drag ? (e) => setDrag({ ...drag, dx: e.clientX - drag.x0, dy: e.clientY - drag.y0 }) : undefined}
              onPointerUp={drag ? (e) => endDrag(e.currentTarget) : undefined}
              onPointerCancel={() => setDrag(null)}>
              {result && (
                // eslint-disable-next-line @next/next/no-img-element -- this is the exact locally generated download Blob.
                <img src={result.objectUrl} width={size.width} height={size.height} alt={`${title}, ${options.format} preview`} draggable={false}
                  className={cn("size-full object-contain transition-opacity duration-200", !ready && "opacity-40")}
                  style={drag ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined} />
              )}
              {!result && !error && <VinylLoader label="Pressing your card…" className="absolute" />}
              {error && <Button variant="outline" className="absolute" onClick={() => { setFailed(null); setAttempt((n) => n + 1); }}>Retry</Button>}
            </div>
          </div>
          <p className="my-2 text-xs text-muted-text" role="status">
            {error ? "Couldn’t render this card." : done && ready ? `${done} ✓` : ready ? [scope, `${size.width} × ${size.height} · PNG`].filter(Boolean).join(" · ") : result ? "Updating…" : null}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {ready?.canShare && <Button className="min-h-11" onClick={share} disabled={sharing}><Share />Share</Button>}
            <Button className="min-h-11" variant={ready?.canShare ? "outline" : "default"} onClick={save} disabled={!ready}><Download />Save PNG</Button>
            <Button className="min-h-11" variant="outline" aria-expanded={customise} onClick={() => setCustomise(!customise)}><SlidersHorizontal />Customise</Button>
          </div>
          {shareError && <p role="alert" className="mt-2 text-sm">Sharing failed. Try again or save the PNG.</p>}
        </div>
        {customise && (
          <div className="mt-5 grid gap-4 border-t border-rule pt-4 md:mt-0 md:border-t-0 md:pt-0">
            {combo && (
              <fieldset>
                <legend className="mb-1 font-semibold">Add cards</legend>
                <p className="mb-2 text-xs text-muted-text">Put up to {MAX_COMBO} stats on one card.</p>
                <div className="grid max-h-48 gap-1 overflow-y-auto pr-1">
                  {combo.options.map((o) => {
                    const on = comboIds.includes(o.id);
                    const locked = o.id === combo.first || (!on && comboIds.length >= MAX_COMBO);
                    return (
                      <label key={o.id} className={cn("flex min-h-11 items-center gap-3 text-sm", locked && !on && "opacity-50")}>
                        <input type="checkbox" className="size-4 accent-[var(--text)]" checked={on} disabled={locked}
                          onChange={() => { reset(); setComboIds((ids) => (on ? ids.filter((id) => id !== o.id) : [...ids, o.id])); }} />
                        {o.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}
            <PhotoControl photo={photo} onChange={changePhoto} coverOf={async () => {
              const url = new URL(cardSrc, "https://vinylytics.invalid");
              url.searchParams.set("as", "json");
              const spec = (await (await apiFetch(url.pathname + url.search)).json()) as CardSpec;
              return spec.type === "content" ? spec.card.cover ?? null : null;
            }} />
            {!ownLayout && <div className="min-w-0"><p className="mb-2 font-semibold">Visual</p>
              <VisualTiles value={options.visual} ink={options.ink} onChange={(visual) => setOptions(() => ({ visual }))} />
            </div>}
            <fieldset><legend className="mb-2 font-semibold">Format</legend><div className="flex gap-1">
              {(["post", "story"] as CardFormat[]).map((format) => <button key={format} className={choice} aria-pressed={options.format === format}
                onClick={() => setOptions(() => ({ format }))}>{format}</button>)}
            </div></fieldset>
            {comboIds.length < 2 && <InkPicker value={options.ink} eraInk={defaultInk} eraLabel={kind === "era" ? "This era" : "Default"}
              onChange={(ink) => setOptions(() => ({ ink }))} />}
            {!ownLayout && <>
              <DensitySlider value={options.density} onChange={setDensity}
                custom={presetFields(kind, options.density).join(",") !== options.fields.join(",")} />
              <FieldToggles kind={kind} fields={options.fields} preview={preview} ink={options.ink}
                onToggle={(f) => setOptions((o) => ({ fields: FIELDS.filter((v) => (v === f) !== o.fields.includes(v)) }))} />
            </>}
          </div>
        )}
      </div>
    </dialog>
  );
}
