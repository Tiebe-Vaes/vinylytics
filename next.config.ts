import type { NextConfig } from "next";

/**
 * `npm run build:browser`: the browser-only app (served at /app). A static
 * export that only sees `*.browser.tsx` route files, with the server-only
 * modules swapped for in-browser versions (PGlite instead of Postgres).
 */
const browser = process.env.VINYLYTICS_BROWSER === "1";

const browserConfig: NextConfig = {
  output: "export",
  basePath: "/app",
  distDir: "out-browser",
  pageExtensions: ["browser.tsx", "browser.ts"],
  images: { unoptimized: true },
  // Route types here cover only the browser routes, so the server pages fail them.
  // `npm run typecheck` checks every file, these included, against the full route set.
  typescript: { ignoreBuildErrors: true },
  env: { NEXT_PUBLIC_BROWSER_MODE: "1", NEXT_PUBLIC_BASE_PATH: "/app" },
  turbopack: {
    root: __dirname,
    resolveAlias: {
      "@/db": "./src/browser/db.ts",
      "next/cache": "./src/browser/next-cache.ts",
      "@/lib/spotify/import-send": "./src/browser/import-send.ts",
      "@/lib/card": "./src/browser/card.tsx",
      "@/lib/api-fetch": "./src/browser/api-fetch.ts",
      "@/lib/owner": "./src/browser/owner.ts",
      "@/app/(app)/eras/actions": "./src/browser/era-actions.ts",
      "@/lib/dominant-colour": "./src/browser/dominant-colour.ts",
    },
  },
};

const serverConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in a parent folder would otherwise be picked up.
  turbopack: { root: __dirname },
  // Share cards read these .woff files at runtime (lib/card.tsx); tracing can't see a variable path.
  outputFileTracingIncludes: {
    "/api/card/**": [
      "./node_modules/@fontsource/big-shoulders/files/big-shoulders-latin-900-normal.woff",
      "./node_modules/@fontsource/archivo/files/archivo-latin-400-normal.woff",
      "./node_modules/@fontsource/archivo/files/archivo-latin-600-normal.woff",
    ],
  },
};

export default browser ? browserConfig : serverConfig;
