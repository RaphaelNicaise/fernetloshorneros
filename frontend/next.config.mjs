/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    // Habilitar optimización de imágenes
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Formatos modernos para mejor compresión
    formats: ['image/avif', 'image/webp'],
  },

  output: 'standalone',
}

export default nextConfig