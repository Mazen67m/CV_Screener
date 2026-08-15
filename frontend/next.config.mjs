/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/__clerk/:path*',
        destination: `${process.env.NEXT_PUBLIC_CLERK_FAPI_URL}/:path*`,
      },
    ]
  },
}

export default nextConfig;
