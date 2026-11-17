import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

export default nextConfig;
