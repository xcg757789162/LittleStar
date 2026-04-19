/**
 * React Router 路由配置
 * 包含认证守卫：未登录重定向到 /auth，无孩子重定向到 /create-child
 */

import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useChildStore } from '@/stores/childStore'
import { Home } from '@/pages/Home'
import { LearningHistory } from '@/pages/LearningHistory'
import { ParentDashboard } from '@/pages/ParentDashboard'
import { ParentSettings } from '@/pages/ParentSettings'
import { ParentLogs } from '@/pages/ParentLogs'
import { PlacementTestWrapper } from '@/pages/PlacementTestWrapper'
import { PlacementTestSelectPage } from '@/pages/PlacementTestSelectPage'
import { AuthPage } from '@/pages/AuthPage'
import { CreateChildPage } from '@/pages/CreateChildPage'
import { NotFound } from '@/pages/NotFound'
import { NativeClassroom } from '@/pages/NativeClassroom'
import { ClassroomSettings } from '@/pages/ClassroomSettings'
import { GenerationPreview } from '@/pages/GenerationPreview'
import { SubjectMasteryPage } from '@/pages/SubjectMasteryPage'
import { KnowledgePage } from '@/pages/KnowledgePage'
import { AppLayout } from '@/components/layout/AppLayout'

/** 认证守卫：未登录 → /auth */
function RequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }
  return <Outlet />
}

/** 已登录 + 有孩子守卫：无孩子 → /create-child */
function RequireChild() {
  const childrenList = useChildStore((s) => s.children)
  if (childrenList.length === 0) {
    return <Navigate to="/create-child" replace />
  }
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

/** 已登录时访问 /auth → 重定向到首页 */
function GuestOnly() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

export function AppRoutes() {
  return (
    <Routes>
      {/* 公开路由（已登录则跳转首页） */}
      <Route element={<GuestOnly />}>
        <Route path="/auth" element={<AuthPage />} />
      </Route>

      {/* 需登录的路由 */}
      <Route element={<RequireAuth />}>
        {/* 创建孩子（不需要有孩子） */}
        <Route path="/create-child" element={<CreateChildPage />} />

        {/* 需登录 + 有孩子的路由（包含 AppLayout） */}
        <Route element={<RequireChild />}>
          <Route path="/" element={<Home />} />
          <Route path="/preview" element={<GenerationPreview />} />
          <Route path="/classroom" element={<NativeClassroom />} />
          <Route path="/classroom-settings" element={<ClassroomSettings />} />
          <Route path="/history" element={<LearningHistory />} />
          <Route path="/parent" element={<ParentDashboard />} />
          <Route path="/parent/settings" element={<ParentSettings />} />
          <Route path="/parent/logs" element={<ParentLogs />} />
          <Route path="/placement-test-select" element={<PlacementTestSelectPage />} />
          <Route path="/placement-test/:courseSlug" element={<PlacementTestWrapper />} />
          <Route path="/subject-mastery/:subject" element={<SubjectMasteryPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  )
}
