import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        {
          source: "/api/champions",
          destination: `${BACKEND_URL}/api/champions`,
        },
        {
          source: "/api/hextech",
          destination: `${BACKEND_URL}/api/hextech`,
        },
        {
          source: "/health",
          destination: `${BACKEND_URL}/health`,
        },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
