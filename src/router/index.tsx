/**
 * React Router 路由配置
 */

import { Routes, Route } from 'react-router-dom'
import { Home } from '@/pages/Home'
import { LearningSession } from '@/pages/LearningSession'
import { StarMap } from '@/pages/StarMap'
import { ParentDashboard } from '@/pages/ParentDashboard'
import { ParentSettings } from '@/pages/ParentSettings'
import { PlacementTestWrapper } from '@/pages/PlacementTestWrapper'
import { LearningReportPage } from '@/pages/LearningReportPage'
import { ReportDetailPage } from '@/pages/ReportDetailPage'
import { NotFound } from '@/pages/NotFound'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/learn" element={<LearningSession />} />
      <Route path="/starmap" element={<StarMap />} />
      <Route path="/parent" element={<ParentDashboard />} />
      <Route path="/parent/settings" element={<ParentSettings />} />
      <Route path="/placement-test/:subject/:grade" element={<PlacementTestWrapper />} />
      <Route path="/reports" element={<LearningReportPage />} />
      <Route path="/reports/:reportId" element={<ReportDetailPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
