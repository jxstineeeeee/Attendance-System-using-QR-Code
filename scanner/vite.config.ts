import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const target =
    env.VITE_API_PROXY_TARGET ?? 'http://localhost/qr-attendance-api/public'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // 5174, so the scanner and the registrar can run side by side.
      port: 5174,
      proxy: {
        '/api': {
          target,
          changeOrigin: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
