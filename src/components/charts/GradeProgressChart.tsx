/**
 * 年级进度环形图
 */

import type { GradeProgress } from '@/types/models'

interface GradeProgressChartProps {
  progress: GradeProgress
}

export function GradeProgressChart({ progress }: GradeProgressChartProps) {
  const { percentage, masteredNodes, totalNodes } = progress

  return (
    <div
      data-testid="grade-progress-chart"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px',
      }}
    >
      {/* 简单圆环进度 */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `conic-gradient(#4CAF50 ${percentage * 3.6}deg, #E0E0E0 0deg)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            backgroundColor: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 700,
            color: '#4CAF50',
          }}
        >
          {percentage}%
        </div>
      </div>
      <p style={{ fontSize: '14px', color: '#888' }}>
        已掌握 {masteredNodes}/{totalNodes} 个知识点
      </p>
    </div>
  )
}
