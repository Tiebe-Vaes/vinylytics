import { NextResponse, type NextRequest } from "next/server";
import { originAllowed } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) return new NextResponse(null, { status: 403 });
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  res.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  return res;
}
