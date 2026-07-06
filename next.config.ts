import type { NextConfig } from "next";

const nextConfig = {
  devIndicators: false,
  allowedDevOrigins: ['192.168.0.42'],
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  middlewareClientMaxBodySize: '50mb',
} satisfies Record<string, unknown>;

export default nextConfig;
