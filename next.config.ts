import type { NextConfig } from "next";

const cloudflarePages = process.env.TOUYA_CF_PAGES === "1";

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  ...(cloudflarePages
    ? {
        output: "export" as const,
        distDir: ".next-cf",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
