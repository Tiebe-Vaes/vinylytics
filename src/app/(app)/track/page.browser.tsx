"use client";

import { browserPage } from "@/browser/render-page";
import TrackPage from "./[id]/page";

/** Track detail, from ?id=. */
export default browserPage(TrackPage, (q) => ({ id: q.get("id") ?? "" }));
