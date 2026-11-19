// Browser build only: stands in for `next/cache`. Queries run against the
// local database each time, so caching and tag revalidation do nothing.
export function unstable_cache<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn;
}

export function revalidateTag(): void {}

export function revalidatePath(): void {}
