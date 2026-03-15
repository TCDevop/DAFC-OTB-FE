/** @type {import('next').NextConfig} */

// API URL for CSP connect-src — read at build time so the correct origin is allowed
const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
// Extract origin (scheme + host + port) from the full API URL
const apiOrigin = apiUrl ? new URL(apiUrl).origin : '';

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',    value: 'on' },
  { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",   // unsafe-inline needed for window.__ENV__ injection
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.blob.core.windows.net https://*.azurewebsites.net https://*.amazonaws.com https://*.cloudinary.com",
      // Include backend API origin explicitly so cross-origin fetch is allowed by CSP
      `connect-src 'self' ${apiOrigin} https://*.azurewebsites.net https://login.microsoftonline.com https://graph.microsoft.com`,
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  // Allow cross-origin dev requests from any origin (dev only, no effect in production)
  allowedDevOrigins: ['*'],
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
