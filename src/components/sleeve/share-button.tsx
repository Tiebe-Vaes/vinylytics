"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CardField } from "@/lib/card-options";
import type { InkId } from "@/lib/ink";

const CardComposer = dynamic(() => import("./card-composer"));

export type ShareButtonProps = {
  href: string; filename: string; label?: string; title?: string; defaultInk?: InkId;
  /** What produced the card, e.g. "Top artists · Last 4 weeks · Minutes"; shown under the preview. */
  scope?: string;
  /** The real value behind each optional fact, shown on its toggle card. */
  preview?: Partial<Record<CardField, string>>;
};

export function ShareButton(props: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={trigger} size="lg" className="min-h-11" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        <Share aria-hidden="true" />{props.label ?? "Share"}
      </Button>
      {open && <CardComposer {...props} onClose={() => { setOpen(false); trigger.current?.focus(); }} />}
    </>
  );
}
