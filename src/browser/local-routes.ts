// Browser build only: the API route handlers the tab runs itself (see api-fetch.ts).
// Loaded on first use, so satori and the card code stay out of the first page load.
import { GET as top } from "@/app/api/card/top/route";
import { GET as item } from "@/app/api/card/item/route";
import { GET as recap } from "@/app/api/card/recap/route";
import { GET as era } from "@/app/api/card/era/[id]/route";
import { GET as search } from "@/app/api/search/route";

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

export const ROUTES: [RegExp, Handler][] = [
  [/^\/api\/card\/top$/, top],
  [/^\/api\/card\/item$/, item],
  [/^\/api\/card\/recap$/, recap],
  [/^\/api\/card\/era\/([^/]+)$/, era as Handler],
  [/^\/api\/search$/, search],
];
