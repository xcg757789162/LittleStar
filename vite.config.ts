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
      // === LittleStar 后端 API（通过 Nginx 网关） ===
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

      // === OpenMAIC 代理（同源架构，无需 path rewrite） ===
      // 前端 API 调用和 iframe 嵌入统一走 /openmaic 路径
      '/openmaic': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // OpenMAIC Next.js 静态资源（iframe 内部请求）
      '/_next': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // OpenMAIC 公共资源（iframe 内部绝对路径请求）
      '/avatars': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // 媒体文件
      '/media': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // iframe 桥接脚本
      '/iframe-bridge.js': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // 健康检查
      '/health': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
