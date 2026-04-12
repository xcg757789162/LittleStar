import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      // LittleStar Auth Service
      '/api/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // PostgREST 数据库 REST API
      '/api/rest': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // OpenMAIC Pipeline API（原生集成）
      '/openmaic': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // 静态资源代理
      '/_next': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/avatars': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Pre-Generation Backend API（通过 Nginx 代理，Nginx 内部转发到 3003）
      '/api/pre-generate': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // OpenMAIC 内部 API 通配符代理（SSE 支持）
      // 覆盖 /api/generate/*, /api/chat, /api/server-providers,
      // /api/proxy-media 等 OpenMAIC Next.js API Routes
      // 注意：/api/auth、/api/rest、/api/pre-generate 在上面精确匹配，优先级更高
      '/api/': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
