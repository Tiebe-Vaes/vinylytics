import { redirect } from "next/navigation";
import { isOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  "not-owner": "This copy belongs to another Spotify account.",
  config: "Spotify isn't set up yet. Check SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI, AUTH_SECRET and DATABASE_URL.",
  failed: "Sign-in didn't complete. Try again.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await isOwner()) redirect("/");
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">Vinylytics</h1>
      {message && (
        <p role="alert" className="text-sm text-bad">
          {message}
        </p>
      )}
      <a
        href="/api/auth/login"
        className="inline-flex h-10 items-center justify-center rounded-[2px] bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Sign in with Spotify
      </a>
    </main>
  );
}
