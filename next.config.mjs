/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "antd",
      "@ant-design/icons",
      "lucide-react",
      "date-fns",
    ],
  },
  async rewrites() {
    // Backward-compatible alias while clients migrate from /api/bff → /api/v1
    return [
      {
        source: "/api/bff/:path*",
        destination: "/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
