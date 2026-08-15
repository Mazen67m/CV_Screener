/** @type {import('next').NextConfig} */

// Clerk auto-proxy is handled by clerkMiddleware in @clerk/nextjs v6+.
// No next.config.mjs rewrite is needed for *.vercel.app domains.
// The middleware matcher includes '/__clerk/:path*' which routes proxy traffic
// through Clerk's own middleware handler automatically.

const nextConfig = {}

export default nextConfig;

