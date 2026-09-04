import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Repo root holds the scanner CLI lockfile; pin this app as its own root.
  turbopack: { root: __dirname },
  /* config options here */
};

export default nextConfig;
