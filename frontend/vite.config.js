import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '',                 // مهم للإنتاج على Render
  server: { port: 5173, host: true },   // للتطوير فقط
  build: { outDir: 'dist', sourcemap: true }
})