/**
 * The shared tile surface (see DESIGN.md). The backdrop blur only applies from
 * `md` up: on phones it would sit over a constantly animating WebGL canvas and
 * cost GPU time on every frame.
 */
export const tileSurfaceClasses =
  "rounded-[20px] bg-[color-mix(in_oklab,var(--card)_var(--tile-bg-mix),transparent)] md:backdrop-blur-[16px] md:backdrop-saturate-[1.2] shadow-[inset_0_1px_0_var(--tile-highlight),var(--tile-shadow)]";
