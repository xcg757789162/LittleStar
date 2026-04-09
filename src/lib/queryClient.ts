/**
 * 共享 QueryClient 实例
 *
 * 在 main.tsx 和 authStore 中都需要访问同一个 QueryClient 实例。
 * 提取到独立模块避免循环依赖。
 */

import { QueryClient } from '@tanstack/react-query'

/**
 * React Query 全局配置
 * - staleTime: 5 分钟（数据 5 分钟内视为新鲜，不重新请求）
 * - retry: 1 次（失败后最多重试 1 次）
 * - refetchOnWindowFocus: false（切换窗口不自动重新请求）
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
