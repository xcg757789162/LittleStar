/**
 * 报告详情页
 * 5 个指标模块：时长卡片、掌握趋势图、成就里程碑、薄弱知识点、年级进度环
 */

import { useParams, useNavigate } from 'react-router-dom'
import { useReportStore } from '@/stores/reportStore'
import { GRADE_LABELS } from '@/types/grades'
import { LearningTimeChart } from '@/components/charts/LearningTimeChart'
import { MasteryTrendChart } from '@/components/charts/MasteryTrendChart'
import { GradeProgressChart } from '@/components/charts/GradeProgressChart'
import type { GradeLevel, Subject } from '@/types/models'

const SUBJECT_LABELS: Record<Subject, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
}

export function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const navigate = useNavigate()
  const { reports } = useReportStore()

  const report = reports.find((r) => r.id === reportId)

  if (!report) {
    return (
      <div
        data-testid="report-detail-page"
        style={{
          padding: '24px',
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '48px' }}>📄</p>
        <p style={{ color: '#999' }}>报告未找到</p>
        <button
          data-testid="detail-back-btn"
          onClick={() => navigate('/reports')}
          style={{
            marginTop: '16px',
            padding: '8px 24px',
            borderRadius: '20px',
            border: '1px solid #E0E0E0',
            backgroundColor: '#fff',
            cursor: 'pointer',
          }}
        >
          返回列表
        </button>
      </div>
    )
  }

  const { metrics } = report
  const gradeLabel = GRADE_LABELS[report.gradeLevel as GradeLevel] ?? report.gradeLevel
  const subjectLabel = report.subject
    ? SUBJECT_LABELS[report.subject as Subject] ?? report.subject
    : '全科'

  return (
    <div
      data-testid="report-detail-page"
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
          data-testid="detail-back-btn"
          onClick={() => navigate('/reports')}
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
        <div>
          <h1 style={{ fontSize: '20px', color: '#333', margin: 0 }}>
            {gradeLabel} · {subjectLabel}
          </h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
            {report.periodStart} ~ {report.periodEnd}
          </p>
        </div>
      </div>

      {/* 1. 学习时长卡片 */}
      <Section title="📖 学习时长">
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '32px', fontWeight: 700, color: '#4CAF50' }}>
            {metrics.totalLearningMinutes}
          </span>
          <span style={{ fontSize: '14px', color: '#888', marginLeft: '4px' }}>分钟</span>
        </div>
        <LearningTimeChart data={metrics.dailyLearningMinutes} />
      </Section>

      {/* 2. 掌握趋势 */}
      <Section title="📈 掌握趋势">
        {metrics.knowledgeMastery.length > 0 ? (
          <MasteryTrendChart data={metrics.knowledgeMastery} />
        ) : (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>暂无趋势数据</p>
        )}
      </Section>

      {/* 3. 成就里程碑 */}
      <Section title="🏆 成就里程碑">
        {metrics.achievements.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {metrics.achievements.map((a, i) => (
              <span
                key={i}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  backgroundColor: '#FFF8E1',
                  fontSize: '13px',
                  color: '#F57F17',
                }}
              >
                🌟 {a.name}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>继续努力，即将达成新成就！</p>
        )}
      </Section>

      {/* 4. 薄弱知识点 */}
      <Section title="⚠️ 薄弱知识点">
        {metrics.weakPoints.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {metrics.weakPoints.map((wp) => (
              <div
                key={wp.nodeId}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#FFF3E0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ fontWeight: 500, color: '#333', margin: 0 }}>{wp.nodeName}</p>
                  <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>
                    {wp.suggestion}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: wp.masteryLevel < 40 ? '#D32F2F' : '#E65100',
                  }}
                >
                  {wp.masteryLevel}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>太棒了，没有薄弱知识点！</p>
        )}
      </Section>

      {/* 5. 年级进度环 */}
      <Section title="🎓 年级进度">
        <GradeProgressChart progress={metrics.gradeProgress} />
      </Section>
    </div>
  )
}

/** 通用区段组件 */
function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        marginBottom: '20px',
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: '#FAFAFA',
        border: '1px solid #F0F0F0',
      }}
    >
      <h2
        style={{
          fontSize: '16px',
          color: '#333',
          marginBottom: '12px',
          margin: '0 0 12px',
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}
