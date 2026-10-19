/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com', 'drive.google.com'],
  },
  async redirects() {
    return [
      { source: '/dashboard', destination: '/leads', permanent: false },
      { source: '/analytics', destination: '/downloads', permanent: false },
    ]
  },
}

module.exports = nextConfig
