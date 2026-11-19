"use client";

import { cloneElement, createElement, isValidElement, Suspense, useEffect, type ReactElement, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { VinylLoader } from "@/components/vinyl-loader";

/**
 * The browser build reuses the server pages as they are. A server page is an
 * async component that awaits its data, then returns JSX. `resolve` does what the
 * server would: it calls every async component in the tree, awaits it, and leaves
 * a tree that React can render on the client. Queries run against the local PGlite.
 */

const AsyncFunction = (async () => {}).constructor;
const isAsync = (type: unknown): type is (props: unknown) => Promise<ReactNode> =>
  typeof type === "function" && type instanceof AsyncFunction;

export async function resolve(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolve));
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  if (isAsync(element.type)) return resolve(await element.type(element.props));
  // Elements can sit in any prop (children, actions={…}, fallback={…}).
  const next: Record<string, unknown> = {};
  let changed = false;
  for (const [key, value] of Object.entries(element.props)) {
    if (key !== "children" && !isValidElement(value) && !Array.isArray(value)) continue;
    const resolved = await resolve(value as ReactNode);
    if (resolved !== value) { next[key] = resolved; changed = true; }
  }
  return changed ? cloneElement(element, next) : element;
}

const EVENT = "vinylytics:data";

/** Call after a local write (era rename, merge, restore) so open pages reload their data. */
export function dataChanged() {
  window.dispatchEvent(new Event(EVENT));
}

type PageProps = { params: Promise<Record<string, string>>; searchParams: Promise<Record<string, string>> };

/**
 * Turns a server page into a browser page. `params` maps the query string to the
 * route params the server page expects (detail pages carry their id in the query).
 */
export function browserPage(
  // Server pages type their props per route (PageProps<"/eras/[id]">); all take this shape.
  page: unknown,
  params: (query: URLSearchParams) => Record<string, string> = () => ({}),
) {
  const Page = page as (props: PageProps) => ReactNode | Promise<ReactNode>;
  function Resolved() {
    const query = useSearchParams();
    const pathname = usePathname();
    const client = useQueryClient();
    const { data, error } = useQuery({
      queryKey: ["page", pathname, query.toString()],
      queryFn: () => resolve(createElement(Page, {
        params: Promise.resolve(params(query)),
        searchParams: Promise.resolve(Object.fromEntries(query)),
      })),
      staleTime: Infinity,
      retry: false,
    });
    useEffect(() => {
      const reload = () => void client.invalidateQueries({ queryKey: ["page"] });
      window.addEventListener(EVENT, reload);
      return () => window.removeEventListener(EVENT, reload);
    }, [client]);
    // notFound() and redirect() throw; rethrowing lets Next's boundaries handle them.
    if (error) throw error;
    return data === undefined ? <VinylLoader label="Pressing the page…" className="py-24" /> : <>{data}</>;
  }
  return function BrowserPage() {
    return <Suspense><Resolved /></Suspense>;
  };
}
