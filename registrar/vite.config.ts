import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Apache (Laragon) serves the PHP API; Vite forwards /api to it so the
  // browser stays on one origin and the PHP session cookie just works.
  const target =
    env.VITE_API_PROXY_TARGET ?? 'http://localhost/qr-attendance-api/public'

  return {
    plugins: [react(), tailwindcss()],
    server: {
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
