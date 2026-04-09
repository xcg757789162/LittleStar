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
 * - retry: 网络错误不重试，其他错误重试 1 次
 * - refetchOnWindowFocus: false（切换窗口不自动重新请求）
 * - networkMode: always（即使离线也执行 queryFn，让错误快速暴露）
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        // 网络错误（后端不可达）不重试，避免长时间卡住
        if (error instanceof TypeError && error.message.includes('fetch')) return false
        if (error instanceof Error && (error.message.includes('NetworkError') || error.message.includes('Failed to fetch'))) return false
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
      networkMode: 'always',
    },
  },
})
