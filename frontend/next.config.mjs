/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  typescript: {
    ignoreBuildErrors: true,
  },

  output: 'standalone',

  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: 'backend' },
      { protocol: 'https', hostname: 'fernetloshorneros.com' },
      { protocol: 'https', hostname: 'api.fernetloshorneros.com' }
    ]
  }
}

export default nextConfig