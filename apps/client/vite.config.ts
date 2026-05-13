import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        silenceDeprecations: ['import'],
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@repo/utils': resolve(__dirname, '../../packages/utils/index.ts'),
      '@repo/types': resolve(__dirname, '../../packages/types/index.ts'),
    },
  },
  server: {
    port: 5173,
    hmr: { overlay: false },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
