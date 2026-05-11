import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "prisma", "playwright", "@remotion/renderer", "@remotion/bundler"]
};

export default nextConfig;
