"use client";

import Form from "next/form";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { ArrowRight, Search } from "lucide-react";
import { Cover } from "@/components/sleeve/cover";
import { apiFetch } from "@/lib/api-fetch";

type Item = { kind: "artist" | "album" | "track"; key: string; name: string; subtitle: string | null; cover: string | null; href: string };
type Group = { kind: Item["kind"]; items: Item[] };
const LABEL: Record<Item["kind"], string> = { artist: "Artists", album: "Albums", track: "Songs" };
/** Wait this long after the last keystroke before asking the server. */
const DEBOUNCE_MS = 150;

/**
 * Library search with live, grouped suggestions. Enter without a highlighted
 * suggestion still opens the full results page.
 */
export function LibrarySearch({ query = "" }: { query?: string }) {
  const [value, setValue] = useState(query);
  const [groups, setGroups] = useState<Group[]>([]);
  const aborter = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      aborter.current?.abort();
      const controller = new AbortController();
      aborter.current = controller;
      try {
        const res = await apiFetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) setGroups(await res.json());
      } catch { /* A newer keystroke aborted this one. */ }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  const shown = value.trim().length < 2 ? [] : groups;
  return (
    <Autocomplete.Root items={shown} filter={null} value={value} onValueChange={setValue} itemToStringValue={(item: Item) => item.name}>
      <Form action="/search" role="search" aria-label="Music library" className="flex min-w-0 items-center border border-strong bg-ground focus-within:border-text">
        <Search className="ml-3 size-4 shrink-0 text-muted-text" aria-hidden />
        <Autocomplete.Input aria-label="Search your library" type="search" name="q" maxLength={100} placeholder="Search your library"
          className="h-11 w-36 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none sm:w-48" />
        <button aria-label="Search" className="flex size-11 shrink-0 items-center justify-center hover:bg-muted"><ArrowRight className="size-4" aria-hidden /></button>
      </Form>
      <Autocomplete.Portal>
        <Autocomplete.Positioner sideOffset={6} align="end" className="z-50">
          <Autocomplete.Popup className="max-h-[min(70vh,28rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto border border-strong bg-ground p-1 shadow-lg transition-[opacity,transform] duration-150 data-[ending-style]:opacity-0 data-[starting-style]:-translate-y-1 data-[starting-style]:opacity-0">
            <Autocomplete.Empty className="px-3 py-2 text-sm text-muted-text empty:hidden">No matches yet. Press Enter for full results.</Autocomplete.Empty>
            <Autocomplete.List>
              {(group: Group) => (
                <Autocomplete.Group key={group.kind} items={group.items} className="py-1">
                  <Autocomplete.GroupLabel className="px-3 py-1 text-xs font-bold tracking-widest text-muted-text uppercase">{LABEL[group.kind]}</Autocomplete.GroupLabel>
                  <Autocomplete.Collection>
                    {(item: Item) => (
                      <Autocomplete.Item key={item.key} value={item} render={<Link href={item.href} />}
                        className="flex min-h-12 items-center gap-3 px-3 py-1.5 text-sm data-[highlighted]:bg-raised">
                        <Cover url={item.cover} alt="" size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{item.name}</span>
                          {item.subtitle && <span className="block truncate text-xs text-muted-text">{item.subtitle}</span>}
                        </span>
                      </Autocomplete.Item>
                    )}
                  </Autocomplete.Collection>
                </Autocomplete.Group>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
