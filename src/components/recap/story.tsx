"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";

/** Digits settle like a mechanical counter, then hold the exact final number. */
function Counter({ to, suffix, onDone }: { to: number; suffix: string; onDone: () => void }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, to, {
      duration: 1.4, ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(Math.round(v)),
      onComplete: () => { setValue(to); onDone(); },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount; onDone is a fresh closure each render.
  }, [to]);
  return <span className="nums" aria-label={`${to.toLocaleString("en-GB")}${suffix}`}>{value.toLocaleString("en-GB")}{suffix}</span>;
}
import { Play, X } from "lucide-react";
import { ShareButton } from "@/components/sleeve/share-button";
import { Button } from "@/components/ui/button";
import { inkHex, inkText } from "@/lib/ink";
import type { Slide } from "@/lib/spotify/recap-slides";

/** "Play my year": full-screen slides, tap or arrow through; no timer, so nothing slips past. */
export function Story({ slides, year }: { slides: Slide[]; year: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const reduced = useReducedMotion();
  // Each count runs once per recap visit; going back shows the final number.
  const [counted, setCounted] = useState<string[]>([]);
  const slide = slides[i];

  useEffect(() => {
    const el = dialog.current;
    if (open) el?.showModal();
    return () => el?.close();
  }, [open]);

  const go = (next: number) => {
    if (next < 0 || next >= slides.length) return;
    setDir(next > i ? 1 : -1);
    setI(next);
  };
  const close = () => { setOpen(false); trigger.current?.focus(); };

  if (!slides.length) return null;
  const bg = inkHex(slide.ink);
  return (
    <>
      <Button ref={trigger} size="lg" className="min-h-11" onClick={() => { setI(0); setOpen(true); }}><Play aria-hidden="true" />Play my year</Button>
      {open && (
        <dialog ref={dialog} aria-label={`${year} in slides`} onCancel={(e) => { e.preventDefault(); close(); }}
          onKeyDown={(e) => { if (e.key === "ArrowRight") go(i + 1); if (e.key === "ArrowLeft") go(i - 1); }}
          className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden p-0 transition-colors duration-300" style={{ background: bg, color: inkText(bg) }}>
          <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 p-4">
            <div className="flex flex-1 gap-1" role="tablist" aria-label="Slides">
              {slides.map((s, k) => (
                <button key={s.id} type="button" role="tab" aria-selected={k === i} aria-label={`Slide ${k + 1}: ${s.kicker}`} onClick={() => go(k)}
                  className="h-11 flex-1 before:block before:h-1 before:rounded-full before:bg-current before:opacity-30 aria-selected:before:opacity-100" />
              ))}
            </div>
            <button type="button" aria-label="Close" onClick={close} className="grid size-11 place-items-center"><X aria-hidden="true" /></button>
          </div>
          {/* Tap zones: left goes back, right goes on. */}
          <button type="button" aria-label="Previous slide" onClick={() => go(i - 1)} className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize" />
          <button type="button" aria-label="Next slide" onClick={() => go(i + 1)} className="absolute inset-y-0 right-0 w-1/3 cursor-e-resize" />
          <AnimatePresence mode="wait" custom={dir}>
            <motion.section key={slide.id} aria-live="polite" className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-4 px-8 md:px-24"
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: dir * 60, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: dir * -60, scale: 0.96 }}
              transition={reduced ? { duration: 0.15 } : { type: "spring", stiffness: 260, damping: 24 }}>
              <p className="text-lg font-semibold md:text-2xl">{slide.kicker}</p>
              <h2 className="display text-[clamp(3rem,12vw,9rem)] leading-[0.95] break-words">
                {slide.count != null && !reduced && !counted.includes(slide.id)
                  ? <Counter to={slide.count} suffix={slide.headline.replace(/^[\d,]+/, "")} onDone={() => setCounted((c) => [...c, slide.id])} />
                  : slide.headline}
              </h2>
              {slide.detail && <p className="max-w-xl text-lg md:text-xl">{slide.detail}</p>}
            </motion.section>
          </AnimatePresence>
          <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <ShareButton href={`/api/card/recap?year=${year}&slide=${slide.id}`} filename={`vinylytics-${year}-${slide.id}.png`} title={slide.kicker} defaultInk={slide.ink} label="Share this slide" />
          </div>
        </dialog>
      )}
    </>
  );
}
