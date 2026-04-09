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
      // 所有 OpenMAIC 请求统一通过 Nginx 网关（8080）转发
      // Nginx 会将 /openmaic/* 路由到容器内部的 openmaic:3002
      //
      // API 代理：LittleStar → Nginx → OpenMAIC API
      '/openmaic-proxy': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // /openmaic-proxy/api/xxx → /openmaic/api/xxx（Nginx 再转发到 openmaic:3002）
        rewrite: (path) => path.replace(/^\/openmaic-proxy/, '/openmaic'),
      },
      // iframe 代理：嵌入 OpenMAIC 原生前端（通过 Nginx，自动剥离 X-Frame-Options 头）
      '/openmaic': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // OpenMAIC 前端静态资源代理（iframe 内页面引用的 CSS/JS/字体/图片）
      // 这些资源以绝对路径引用（/_next/...、/avatars/...），需要通过 Nginx 转发到 OpenMAIC 服务
      '/_next': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path: string) => `/openmaic${path}`,
      },
      '/avatars': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path: string) => `/openmaic${path}`,
      },
      '/logo': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path: string) => `/openmaic${path}`,
      },
    },
  },
})
