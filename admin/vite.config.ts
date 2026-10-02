import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Registrar owns the default 5173 so both apps can run side by side.
  server: { port: 5174 },
})
