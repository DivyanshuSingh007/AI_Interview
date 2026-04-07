import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Opt out of telemetry data collection
  // Suppress the dev overlay warning
  devIndicators: false,
  
  // Allow cross-origin for Daily.co iframe
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
