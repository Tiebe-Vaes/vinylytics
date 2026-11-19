export type Rendered = { src: string; objectUrl: string; file: File | null; canShare: boolean };

/**
 * The share dialog's one rule: a file is offered only when it was rendered from
 * the options on screen now. An older render may stay visible, marked stale.
 */
export function previewState(result: Rendered | null, src: string, failed: string | null) {
  const ready = result?.src === src ? result : null;
  return { ready, stale: Boolean(result) && !ready, error: failed === src && !ready };
}
