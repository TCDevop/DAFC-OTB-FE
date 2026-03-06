/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone for Azure App Services (Node 22/24 compatible)
  output: 'standalone',

  // Disable image optimization (không dùng Vercel)
  images: {
    unoptimized: true,
  },

  // Compress responses
  compress: true,

  // Reduce dev server memory usage
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 3,
  },

  // Logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
