import type { NextConfig } from "next";

// Frontend-only app: no API routes, no server-side state. The GenLayer contract is the
// single source of truth for every case.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Build provenance, baked in at build time so reviewers can match production to a Git commit.
  env: {
    NEXT_PUBLIC_BUILD_COMMIT: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "local",
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  turbopack: {},
};

export default nextConfig;
