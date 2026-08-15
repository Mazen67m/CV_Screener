/** @type {import('next').NextConfig} */

// Upstream Clerk FAPI — decoded from the live publishable key.
// Do NOT set this to the proxy URL (cvscreener1.vercel.app/__clerk) — that creates a loop.
const CLERK_FAPI = 'https://clerk.cvscreener1.clerk.accounts.dev'

const nextConfig = {
  async rewrites() {
    return [
      {
        // Forward all Clerk auto-proxy requests to the upstream Clerk FAPI.
        // Required for *.vercel.app domains (no DNS control).
        source: '/__clerk/:path*',
        destination: `${CLERK_FAPI}/:path*`,
      },
    ]
  },
}

export default nextConfig;
