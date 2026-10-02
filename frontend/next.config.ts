import type { NextConfig } from "next";

// Frontend-only app: no API routes, no server-side state. The GenLayer contract is the
// single source of truth for every case.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
};

export default nextConfig;
