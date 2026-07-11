import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal self-contained server for Docker (.next/standalone/server.js).
  output: "standalone",
};

export default nextConfig;
