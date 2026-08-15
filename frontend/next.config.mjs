/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/__clerk/:path*',
        destination:
          'https://clerk.cvscreener1.vercel.app/__clerk/:path*',
      },
    ]
  },
}

export default nextConfig;
