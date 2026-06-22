import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ['192.168.0.42'],
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
