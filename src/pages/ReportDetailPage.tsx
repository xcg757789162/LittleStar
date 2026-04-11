/**
 * 报告详情页
 * 5 个指标模块：时长卡片、掌握趋势图、成就里程碑、薄弱知识点、年级进度环
 *
 * 🎨 Sunny Playground 风格 — 暖色渐变、圆润卡片、漂浮装饰
 */

import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useReportStore } from '@/stores/reportStore'
import { GRADE_LABELS } from '@/types/grades'
import { LearningTimeChart } from '@/components/charts/LearningTimeChart'
import { MasteryTrendChart } from '@/components/charts/MasteryTrendChart'
import { GradeProgressChart } from '@/components/charts/GradeProgressChart'
import type { GradeLevel, Subject } from '@/types/models'

/* ====== 设计 Token ====== */
const T = {
  bg: 'linear-gradient(170deg, #FFF8E7 0%, #FFE8D6 30%, #FFDEE9 60%, #D4F1F9 100%)',
  font: "'Baloo 2', 'Nunito', sans-serif",
  fontBody: "'Nunito', sans-serif",
  sunOrange: '#FF8C42',
  candyPink: '#FF6B8A',
  grassGreen: '#2EC4B6',
  skyBlue: '#5BC0EB',
  starGold: '#FFD166',
  textDark: '#4A3728',
  textMid: '#8B7355',
  textLight: '#B8A088',
  cardBg: 'rgba(255,255,255,0.85)',
  radius: '20px',
}

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
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: T.bg, fontFamily: T.font, padding: '24px',
          textAlign: 'center', gap: '16px',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
          style={{ fontSize: '64px' }}
        >
          📄
        </motion.div>
        <p style={{ color: T.textMid, fontSize: '16px', fontFamily: T.fontBody }}>
          报告未找到
        </p>
        <motion.button
          data-testid="detail-back-btn"
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/reports')}
          style={{
            marginTop: '8px', padding: '12px 32px', borderRadius: T.radius,
            border: `2px solid ${T.sunOrange}33`, backgroundColor: T.cardBg,
            cursor: 'pointer', fontFamily: T.font, fontSize: '14px',
            color: T.textDark, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          返回列表
        </motion.button>
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
        minHeight: '100vh', background: T.bg, fontFamily: T.font,
        padding: '24px', paddingBottom: '100px',
      }}
    >
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '12px',
          }}
        >
          <motion.button
            data-testid="detail-back-btn"
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/reports')}
            style={{
              background: T.cardBg, border: 'none', fontSize: '18px',
              cursor: 'pointer', padding: '8px 12px', borderRadius: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: T.textDark,
            }}
          >
            ←
          </motion.button>
          <div>
            <h1 style={{
              fontSize: '20px', margin: 0, fontFamily: T.font,
              background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {gradeLabel} · {subjectLabel}
            </h1>
            <p style={{
              fontSize: '13px', color: T.textMid, margin: '4px 0 0',
              fontFamily: T.fontBody,
            }}>
              {report.periodStart} ~ {report.periodEnd}
            </p>
          </div>
        </motion.div>

        {/* 1. 学习时长卡片 */}
        <Section title="📖 学习时长" index={0}>
          <div style={{
            textAlign: 'center', marginBottom: '12px',
            padding: '16px', borderRadius: '16px',
            background: `linear-gradient(135deg, ${T.grassGreen}15, ${T.grassGreen}08)`,
            border: `1px solid ${T.grassGreen}22`,
          }}>
            <span style={{
              fontSize: '36px', fontWeight: 700, fontFamily: T.font,
              background: `linear-gradient(135deg, ${T.grassGreen}, ${T.skyBlue})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {metrics.totalLearningMinutes}
            </span>
            <span style={{
              fontSize: '14px', color: T.textMid, marginLeft: '4px',
              fontFamily: T.fontBody,
            }}>
              分钟
            </span>
          </div>
          <LearningTimeChart data={metrics.dailyLearningMinutes} />
        </Section>

        {/* 2. 掌握趋势 */}
        <Section title="📈 掌握趋势" index={1}>
          {metrics.knowledgeMastery.length > 0 ? (
            <MasteryTrendChart data={metrics.knowledgeMastery} />
          ) : (
            <p style={{
              textAlign: 'center', color: T.textLight, padding: '20px 0',
              fontFamily: T.fontBody,
            }}>
              暂无趋势数据
            </p>
          )}
        </Section>

        {/* 3. 成就里程碑 */}
        <Section title="🏆 成就里程碑" index={2}>
          {metrics.achievements.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {metrics.achievements.map((a, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  style={{
                    padding: '8px 16px', borderRadius: '16px',
                    background: `linear-gradient(135deg, ${T.starGold}25, ${T.starGold}10)`,
                    border: `1px solid ${T.starGold}44`,
                    fontSize: '13px', color: T.textDark, fontFamily: T.fontBody,
                  }}
                >
                  🌟 {a.name}
                </motion.span>
              ))}
            </div>
          ) : (
            <p style={{
              textAlign: 'center', color: T.textLight, padding: '20px 0',
              fontFamily: T.fontBody,
            }}>
              继续努力，即将达成新成就！
            </p>
          )}
        </Section>

        {/* 4. 薄弱知识点 */}
        <Section title="⚠️ 薄弱知识点" index={3}>
          {metrics.weakPoints.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {metrics.weakPoints.map((wp) => (
                <motion.div
                  key={wp.nodeId}
                  whileHover={{ scale: 1.01 }}
                  style={{
                    padding: '14px 16px', borderRadius: '14px',
                    background: `linear-gradient(135deg, ${T.sunOrange}12, ${T.sunOrange}05)`,
                    border: `1px solid ${T.sunOrange}22`,
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{
                      fontWeight: 600, color: T.textDark, margin: 0,
                      fontFamily: T.font, fontSize: '14px',
                    }}>
                      {wp.nodeName}
                    </p>
                    <p style={{
                      fontSize: '12px', color: T.textMid, margin: '4px 0 0',
                      fontFamily: T.fontBody,
                    }}>
                      {wp.suggestion}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '14px', fontWeight: 700, fontFamily: T.font,
                    color: wp.masteryLevel < 40 ? '#D32F2F' : T.sunOrange,
                    background: wp.masteryLevel < 40
                      ? 'rgba(211, 47, 47, 0.08)'
                      : `${T.sunOrange}12`,
                    padding: '4px 10px', borderRadius: '10px',
                  }}>
                    {wp.masteryLevel}%
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <p style={{
              textAlign: 'center', color: T.textLight, padding: '20px 0',
              fontFamily: T.fontBody,
            }}>
              太棒了，没有薄弱知识点！
            </p>
          )}
        </Section>

        {/* 5. 年级进度环 */}
        <Section title="🎓 年级进度" index={4}>
          <GradeProgressChart progress={metrics.gradeProgress} />
        </Section>
      </div>
    </div>
  )
}

/** 通用区段组件 — Sunny Playground 风格 */
function Section({
  title,
  children,
  index = 0,
}: {
  title: string
  children: React.ReactNode
  index?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 300 }}
      style={{
        marginBottom: '20px', padding: '20px', borderRadius: T.radius,
        backgroundColor: T.cardBg, border: '1px solid rgba(255, 140, 66, 0.1)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      <h2 style={{
        fontSize: '16px', fontFamily: T.font, color: T.textDark,
        marginBottom: '12px', margin: '0 0 12px',
      }}>
        {title}
      </h2>
      {children}
    </motion.div>
  )
}
