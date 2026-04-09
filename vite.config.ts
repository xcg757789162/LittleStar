import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      // === PostgreSQL 后端代理（通过 Nginx 网关） ===
      // Auth Service：登录/注册/刷新 token
      '/api/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // PostgREST：数据库 REST API
      '/api/rest': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },

      // === OpenMAIC AI 课堂代理 ===
      // API 代理：LittleStar → OpenMAIC API（已有路径，保持兼容）
      '/openmaic-proxy': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openmaic-proxy/, ''),
      },
      // OpenMAIC API 代理（iframe 内页面的 fetch 请求使用 /api/... 路径）
      // 注意：放在 /api/auth 和 /api/rest 之后，避免拦截后端 API
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // OpenMAIC Next.js 静态资源代理（iframe 内页面引用的 CSS/JS/字体）
      '/_next': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // OpenMAIC 公共资源代理（头像、logo 等）
      '/avatars': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/logo': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // iframe 代理：嵌入 OpenMAIC 原生前端（剥离 X-Frame-Options 头）
      '/openmaic': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openmaic/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // 移除阻止 iframe 嵌入的响应头
            delete proxyRes.headers['x-frame-options']
            delete proxyRes.headers['content-security-policy']
            // 允许同源 iframe 嵌入
            proxyRes.headers['x-frame-options'] = 'SAMEORIGIN'
          })
        },
      },
    },
  },
})
