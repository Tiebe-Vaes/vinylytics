import { NextResponse, type NextRequest } from "next/server";
import { originAllowed } from "@/lib/env";
import { appUrl } from "@/lib/app-url";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) return new NextResponse(null, { status: 403 });
  const res = NextResponse.redirect(appUrl("/login", process.env.SPOTIFY_REDIRECT_URI, req.url), 303);
  res.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  return res;
}
