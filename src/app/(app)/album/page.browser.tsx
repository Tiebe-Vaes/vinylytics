"use client";

import { browserPage } from "@/browser/render-page";
import AlbumPage from "./[id]/page";

/** Album detail, from ?id=. */
export default browserPage(AlbumPage, (q) => ({ id: q.get("id") ?? "" }));
