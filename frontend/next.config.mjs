/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },

  // Build standalone (ideal para Docker)
  output: 'standalone',
}

module.exports = nextConfig
