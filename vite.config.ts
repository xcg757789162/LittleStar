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
      // LittleStar 自身的 API 调用（非 iframe）通过 Vite proxy 转发到 Nginx
      // Nginx 会将 /openmaic/* 路由到容器内部的 openmaic:3002
      '/openmaic-proxy': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // /openmaic-proxy/api/xxx → /openmaic/api/xxx（Nginx 再转发到 openmaic:3002）
        rewrite: (path) => path.replace(/^\/openmaic-proxy/, '/openmaic'),
      },
      // 注：iframe 嵌入 OpenMAIC 原生前端时不走 Vite proxy，
      // 而是直接指向 Nginx 网关（localhost:8080），
      // 确保 OpenMAIC Next.js 前端内部的 API 请求能正确路由到后端。
      // 详见 ClassroomIframe.tsx 中的 toEmbedUrl() 函数。
    },
  },
})
