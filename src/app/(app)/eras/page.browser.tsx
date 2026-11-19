"use client";

import { browserPage } from "@/browser/render-page";
import EraPage from "./[id]/page";

/** Era detail. A static export has no page per era, so the id comes from ?id=. */
export default browserPage(EraPage, (q) => ({ id: q.get("id") ?? "" }));
