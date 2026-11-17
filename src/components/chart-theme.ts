"use client";

import { useTheme } from "next-themes";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Sequential blue ramps for the calendar heatmap: magnitude, not identity, so
 * one hue light to dark. Index 0 is the lowest step. Light theme gets darker
 * with more steps; dark theme gets lighter. Validated in the redesign brief.
 */
const RAMP_LIGHT = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"];
const RAMP_DARK = ["#184f95", "#256abf", "#3987e5", "#6da7ec", "#9ec5f4"];

/** Picks the ramp by theme. Light until mounted, since the theme is unknown during SSR. */
export function useRamp(): string[] {
  const { resolvedTheme } = useTheme();
  const hydrated = useHydrated();

  return hydrated && resolvedTheme === "dark" ? RAMP_DARK : RAMP_LIGHT;
}
