import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
    ],
  },
  // The Form 101 routes read the official form and its font from disk at runtime
  outputFileTracingIncludes: {
    '/api/form101/**': ['./src/assets/form101/**'],
  },
};

export default nextConfig;
