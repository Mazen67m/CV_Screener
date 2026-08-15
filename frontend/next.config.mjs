/** @type {import('next').NextConfig} */
const clerkFapiUrl = process.env.NEXT_PUBLIC_CLERK_FAPI_URL

const nextConfig = {
  async rewrites() {
    if (!clerkFapiUrl) return []
    return [
      {
        source: '/__clerk/:path*',
        destination: `${clerkFapiUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig;
