import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: "/home/openclaw/openclaw-webui",
  },
  serverExternalPackages: ["ws"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://127.0.0.1:* wss://127.0.0.1:*; frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
