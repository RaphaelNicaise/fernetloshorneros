/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Genera build "standalone" para imágenes de producción más livianas
  output: 'standalone',
}

export default nextConfig
