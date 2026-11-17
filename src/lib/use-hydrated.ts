"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * True only after hydration.
 *
 * Anything derived from `localStorage` or the OS colour scheme — i.e. the
 * resolved theme — is unknowable during SSR, so it must not be painted on the
 * first render. `useSyncExternalStore` expresses that without a setState in an
 * effect, which cascades renders (and trips react-hooks/set-state-in-effect).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
