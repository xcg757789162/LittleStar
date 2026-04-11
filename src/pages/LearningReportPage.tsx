/**
 * 学习报告列表页 — Sunny Playground 风格
 * 周报/月报切换 + 报告卡片列表
 */

import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useReportStore } from '@/stores/reportStore'
import { GRADE_LABELS } from '@/types/grades'
import type { ReportData, GradeLevel, Subject } from '@/types/models'

const T = {
  fontDisplay: "'Baloo 2', 'Nunito', sans-serif",
  fontBody: "'Nunito', 'PingFang SC', sans-serif",
  sunOrange: '#FF8C42',
  skyBlue: '#5BC0EB',
  grassGreen: '#2EC4B6',
  candyPink: '#FF6B9D',
  starGold: '#FFC845',
  cardBg: '#FFFFFF',
  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  textWhite: '#FFFFFF',
}

const SUBJECT_LABELS: Record<Subject, string> = {
  math: '数学', chinese: '语文', english: '英语',
}

export function LearningReportPage() {
  const navigate = useNavigate()
  const { filter, setFilter, getFilteredReports } = useReportStore()
  const reports = getFilteredReports()

  return (
    <div
      data-testid="learning-report-page"
      style={{
        padding: '24px', maxWidth: '600px', margin: '0 auto',
        minHeight: '100vh', fontFamily: T.fontBody,
      }}
    >
      {/* 头部 */}
      <div style={{
        display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '12px',
      }}>
        <motion.button
          data-testid="back-btn"
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/parent')}
          style={{
            background: 'none', border: 'none', fontSize: '22px',
            cursor: 'pointer', padding: '4px 8px', color: T.sunOrange,
          }}
        >
          ←
        </motion.button>
        <h1 style={{
          fontSize: '24px', color: T.textDark, margin: 0,
          fontFamily: T.fontDisplay, fontWeight: 'bold',
        }}>
          📊 学习报告
        </h1>
      </div>

      {/* 周报/月报切换 */}
      <div style={{
        display: 'flex', gap: '10px', marginBottom: '20px',
        backgroundColor: '#FFF3E7', borderRadius: '18px', padding: '4px',
      }}>
        {[
          { key: 'weekly' as const, label: '📅 周报' },
          { key: 'monthly' as const, label: '🗓️ 月报' },
        ].map((tab) => (
          <motion.button
            key={tab.key}
            data-testid={`filter-${tab.key}`}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter({ type: tab.key })}
            style={{
              flex: 1, padding: '10px 20px', borderRadius: '14px',
              border: 'none',
              backgroundColor: filter.type === tab.key ? T.sunOrange : 'transparent',
              color: filter.type === tab.key ? T.textWhite : T.textLight,
              cursor: 'pointer', fontWeight: 'bold',
              fontFamily: T.fontDisplay, fontSize: '15px',
              boxShadow: filter.type === tab.key ? '0 4px 12px rgba(255, 140, 66, 0.3)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* 报告列表 */}
      {reports.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: T.textLight,
        }}>
          <motion.p
            style={{ fontSize: '56px', marginBottom: '12px' }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            📊
          </motion.p>
          <p style={{ fontFamily: T.fontDisplay, fontSize: '17px', color: T.textMedium }}>
            暂无报告
          </p>
          <p style={{ fontSize: '13px', color: T.textLight }}>
            完成学习后会自动生成 ✨
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {reports.map((report, index) => (
            <ReportCard key={report.id} report={report} onClick={() => navigate(`/reports/${report.id}`)} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReportCard({ report, onClick, index }: {
  report: ReportData; onClick: () => void; index: number
}) {
  const gradeLabel = GRADE_LABELS[report.gradeLevel as GradeLevel] ?? report.gradeLevel
  const subjectLabel = report.subject
    ? SUBJECT_LABELS[report.subject as Subject] ?? report.subject
    : '全科'

  return (
    <motion.div
      data-testid={`report-card-${report.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        padding: '18px', borderRadius: '22px',
        backgroundColor: T.cardBg, cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px',
      }}>
        <span style={{
          fontWeight: 'bold', color: T.textDark, fontSize: '16px',
          fontFamily: "'Baloo 2', 'Nunito', sans-serif",
        }}>
          {gradeLabel} · {subjectLabel}
        </span>
        <span style={{
          padding: '4px 12px', borderRadius: '12px',
          background: report.type === 'weekly'
            ? 'linear-gradient(135deg, #C8E9FA, #E0F2FE)'
            : 'linear-gradient(135deg, #FFE0C2, #FFECD2)',
          color: report.type === 'weekly' ? T.skyBlue : T.sunOrange,
          fontSize: '12px', fontWeight: 'bold',
        }}>
          {report.type === 'weekly' ? '周报' : '月报'}
        </span>
      </div>
      <p style={{ fontSize: '13px', color: T.textLight, margin: '4px 0' }}>
        {report.periodStart} ~ {report.periodEnd}
      </p>
      <div style={{
        display: 'flex', gap: '16px', marginTop: '10px',
        fontSize: '13px', color: T.textMedium, fontWeight: 600,
      }}>
        <span>📖 {report.metrics.totalLearningMinutes} 分钟</span>
        <span>🎯 {report.metrics.gradeProgress.percentage}% 完成</span>
      </div>
    </motion.div>
  )
}
