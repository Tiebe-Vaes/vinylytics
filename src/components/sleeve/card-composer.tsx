"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, Share, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CARD_SIZES, FIELDS, cardOptions, presetFields, type CardFormat, type CardKind, type Density } from "@/lib/card-options";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import { VinylLoader } from "@/components/vinyl-loader";
import type { ShareButtonProps } from "./share-button";
import { VisualTiles } from "./visual-tiles";
import { previewState, type Rendered } from "./preview-gate";
import { InkPicker } from "./ink-picker";
import { DensitySlider } from "./density-slider";
import { FieldToggles } from "./field-toggles";

const choice = "min-h-11 border border-strong px-3 text-sm font-semibold capitalize aria-pressed:bg-text aria-pressed:text-ground";

export default function CardComposer({ href, filename, title = "Share card", defaultInk = "cobalt", scope, preview, onClose }: ShareButtonProps & { onClose: () => void }) {
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
  // Confirmation lives in the dialog: a toast would sit behind the modal's top layer.
  const [done, setDone] = useState<string | null>(null);
  base.searchParams.set("visual", options.visual);
  base.searchParams.set("format", options.format);
  base.searchParams.set("ink", options.ink);
  base.searchParams.set("density", options.density);
  base.searchParams.set("fields", options.fields.join(","));
  const src = base.pathname + base.search;
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
        const response = await apiFetch(src, { signal: controller.signal, cache: "no-store" });
        if (!response.ok || !response.headers.get("content-type")?.startsWith("image/png")) throw new Error("PNG unavailable");
        const blob = await response.blob();
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

  // Patches apply to the latest options, so quick taps in one frame all land.
  function setOptions(patch: (o: typeof options) => Partial<typeof options>) {
    setDone(null);
    setFailed(null);
    setShareError(false);
    updateOptions((o) => {
      const next = { ...o, ...patch(o) };
      const same = next.visual === o.visual && next.ink === o.ink && next.format === o.format && next.density === o.density &&
        next.fields.join(",") === o.fields.join(",");
      return same ? o : next;
    });
  }

  function setDensity(density: Density) {
    setOptions(() => ({ density, fields: presetFields(kind, density) }));
  }
  const size = CARD_SIZES[options.format];
  return (
    <dialog ref={dialog} aria-labelledby={headingId} onCancel={(event) => { event.preventDefault(); event.stopPropagation(); dismiss(); }}
      className="fixed inset-0 m-auto max-h-[94dvh] w-[min(95vw,48rem)] overflow-y-auto overscroll-contain border border-strong bg-ground p-0 text-text backdrop:bg-black/80">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-rule bg-ground px-4 py-2">
        <h2 id={headingId} className="min-w-0 text-lg font-semibold break-words">{title}</h2>
        <Button variant="ghost" className="size-11" aria-label="Close preview" onClick={dismiss}><X aria-hidden="true" /></Button>
      </header>
      <div className={cn("p-4", customise && "md:grid md:grid-cols-[1fr_1fr] md:items-start md:gap-6")}>
        <div className="flex flex-col items-center">
          <div aria-busy={!ready && !error} className="grid w-full place-items-center bg-raised p-2">
            <div className={cn("relative grid w-auto max-w-full place-items-center",
              options.format === "story" ? "aspect-[9/16]" : "aspect-[4/5]",
              customise ? "h-[30dvh] md:h-[60dvh]" : "h-[58dvh]")}>
              {result && (
                // eslint-disable-next-line @next/next/no-img-element -- this is the exact locally generated download Blob.
                <img src={result.objectUrl} width={size.width} height={size.height} alt={`${title}, ${options.format} preview`}
                  className={cn("size-full object-contain transition-opacity duration-200", !ready && "opacity-40")} />
              )}
              {!result && !error && <VinylLoader label="Pressing your card…" className="absolute" />}
              {error && <Button variant="outline" className="absolute" onClick={() => { setFailed(null); setAttempt((n) => n + 1); }}>Retry</Button>}
            </div>
          </div>
          <p className="my-2 text-xs text-muted-text" role="status">
            {error ? "Couldn’t render this card." : done && ready ? `${done} ✓` : ready ? [scope, `${size.width} × ${size.height} · PNG`].filter(Boolean).join(" · ") : "Rendering your card…"}
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
            <div className="min-w-0"><p className="mb-2 font-semibold">Visual</p>
              <VisualTiles value={options.visual} ink={options.ink} onChange={(visual) => setOptions(() => ({ visual }))} />
            </div>
            <fieldset><legend className="mb-2 font-semibold">Format</legend><div className="flex gap-1">
              {(["post", "story"] as CardFormat[]).map((format) => <button key={format} className={choice} aria-pressed={options.format === format}
                onClick={() => setOptions(() => ({ format }))}>{format}</button>)}
            </div></fieldset>
            <InkPicker value={options.ink} eraInk={defaultInk} eraLabel={kind === "era" ? "This era" : "Default"}
              onChange={(ink) => setOptions(() => ({ ink }))} />
            <DensitySlider value={options.density} onChange={setDensity}
              custom={presetFields(kind, options.density).join(",") !== options.fields.join(",")} />
            <FieldToggles kind={kind} fields={options.fields} preview={preview} ink={options.ink}
              onToggle={(f) => setOptions((o) => ({ fields: FIELDS.filter((v) => (v === f) !== o.fields.includes(v)) }))} />
          </div>
        )}
      </div>
    </dialog>
  );
}
