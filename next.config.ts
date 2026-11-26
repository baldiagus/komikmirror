import type { NextConfig } from "next";

function buildAllowedActionOrigins(): string[] {
  const hosts = new Set<string>([
    "localhost:3000",
    "127.0.0.1:3000",
    "*.ngrok-free.dev",
    "*.ngrok-free.app",
  ]);
  const rawList = [
    process.env.APP_ORIGIN,
    process.env.BETTER_AUTH_URL,
    ...(process.env.TRUSTED_ORIGINS ?? "").split(","),
  ];
  for (const item of rawList) {
    const trimmed = item?.trim();
    if (!trimmed) continue;
    try {
      const u = new URL(trimmed);
      if (u.host) hosts.add(u.host);
    } catch {
      // Allow host-only entries like "*.ngrok-free.dev"
      if (!trimmed.includes("/") && !trimmed.includes(" ")) {
        hosts.add(trimmed);
      }
    }
  }
  return Array.from(hosts);
}

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
      allowedOrigins: buildAllowedActionOrigins(),
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
