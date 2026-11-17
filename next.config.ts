import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in a parent folder would otherwise be picked up.
  turbopack: { root: __dirname },
};

export default nextConfig;
