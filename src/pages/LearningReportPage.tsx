/**
 * 学习报告列表页
 * 周报/月报切换 + 报告卡片列表
 */

import { useNavigate } from 'react-router-dom'
import { useReportStore } from '@/stores/reportStore'
import { GRADE_LABELS } from '@/types/grades'
import type { ReportData, GradeLevel, Subject } from '@/types/models'

const SUBJECT_LABELS: Record<Subject, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
}

export function LearningReportPage() {
  const navigate = useNavigate()
  const { filter, setFilter, getFilteredReports } = useReportStore()
  const reports = getFilteredReports()

  return (
    <div
      data-testid="learning-report-page"
      style={{
        padding: '24px',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      {/* 头部 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '12px',
        }}
      >
        <button
          data-testid="back-btn"
          onClick={() => navigate('/parent')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: '24px', color: '#333', margin: 0 }}>学习报告</h1>
      </div>

      {/* 周报/月报切换 */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
        }}
      >
        <button
          data-testid="filter-weekly"
          onClick={() => setFilter({ type: 'weekly' })}
          style={{
            padding: '8px 20px',
            borderRadius: '20px',
            border: '1px solid #E0E0E0',
            backgroundColor: filter.type === 'weekly' ? '#4CAF50' : '#fff',
            color: filter.type === 'weekly' ? '#fff' : '#666',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          周报
        </button>
        <button
          data-testid="filter-monthly"
          onClick={() => setFilter({ type: 'monthly' })}
          style={{
            padding: '8px 20px',
            borderRadius: '20px',
            border: '1px solid #E0E0E0',
            backgroundColor: filter.type === 'monthly' ? '#4CAF50' : '#fff',
            color: filter.type === 'monthly' ? '#fff' : '#666',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          月报
        </button>
      </div>

      {/* 报告列表 */}
      {reports.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#999',
          }}
        >
          <p style={{ fontSize: '48px', marginBottom: '12px' }}>📊</p>
          <p>暂无报告</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={() => navigate(`/reports/${report.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** 报告卡片 */
function ReportCard({
  report,
  onClick,
}: {
  report: ReportData
  onClick: () => void
}) {
  const gradeLabel = GRADE_LABELS[report.gradeLevel as GradeLevel] ?? report.gradeLevel
  const subjectLabel = report.subject
    ? SUBJECT_LABELS[report.subject as Subject] ?? report.subject
    : '全科'

  return (
    <div
      data-testid={`report-card-${report.id}`}
      onClick={onClick}
      style={{
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: '#fff',
        border: '1px solid #E8E8E8',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontWeight: 600, color: '#333' }}>
          {gradeLabel} · {subjectLabel}
        </span>
        <span
          style={{
            padding: '2px 10px',
            borderRadius: '10px',
            backgroundColor: report.type === 'weekly' ? '#E3F2FD' : '#FFF3E0',
            color: report.type === 'weekly' ? '#1565C0' : '#E65100',
            fontSize: '12px',
          }}
        >
          {report.type === 'weekly' ? '周报' : '月报'}
        </span>
      </div>
      <p style={{ fontSize: '13px', color: '#888', margin: '4px 0' }}>
        {report.periodStart} ~ {report.periodEnd}
      </p>
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginTop: '8px',
          fontSize: '13px',
          color: '#666',
        }}
      >
        <span>📖 {report.metrics.totalLearningMinutes} 分钟</span>
        <span>🎯 {report.metrics.gradeProgress.percentage}% 完成</span>
      </div>
    </div>
  )
}
