import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // permite acceder desde la red y dentro de Docker
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // mejora detección de cambios en volúmenes montados (Docker/Windows)
      interval: 100,
    },
    hmr: {
      clientPort: 5173, // asegura que el cliente HMR use el puerto expuesto
    },
  },
})
