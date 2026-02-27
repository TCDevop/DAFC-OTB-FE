/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone for Azure App Services (Node 22/24 compatible)
  output: 'standalone',

  // Disable image optimization (không dùng Vercel)
  images: {
    unoptimized: true,
  },

  // Transpile packages if needed for Node 22/24
  transpilePackages: [],

  // Logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
