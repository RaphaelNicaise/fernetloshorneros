/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  typescript: {
    ignoreBuildErrors: true,
  },

  output: 'standalone',
}

export default nextConfig