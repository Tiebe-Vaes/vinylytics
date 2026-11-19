"use client";

import { browserPage } from "@/browser/render-page";
import ArtistPage from "./[name]/page";

/** Artist detail, from ?name= (the server page decodes the route param). */
export default browserPage(ArtistPage, (q) => ({ name: encodeURIComponent(q.get("name") ?? "") }));
