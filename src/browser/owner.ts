// Browser build only: stands in for `@/lib/owner`. The history in this browser
// belongs to whoever opened it, so there is no sign-in and no cookie to read.
export async function isOwner(): Promise<boolean> {
  return true;
}

export async function storedOwner(): Promise<string | null> {
  return null;
}
