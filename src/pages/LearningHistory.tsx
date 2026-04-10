/**
 * 学习历史页面 — Sunny Playground 风格
 * 展示孩子已完成的课堂记录，支持按科目筛选
 * 每条记录提供"快速复习"和"智能重学"两种操作
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useChildStore } from '@/stores/childStore'
import { ReviewLearningService, type HistoryListItem } from '@/services/review-learning'
import type { Subject } from '@/types/models'

/* ═══════════════════════════════════════════
   设计 Token
   ═══════════════════════════════════════════ */
const T = {
  fontDisplay: "'Baloo 2', 'Nunito', sans-serif",
  fontBody: "'Nunito', 'PingFang SC', sans-serif",
  bgGradient: 'linear-gradient(170deg, #FFF8E7 0%, #FFE8D6 30%, #FFDEE9 60%, #D4F1F9 100%)',
  sunOrange: '#FF8C42',
  sunYellow: '#FFD166',
  skyBlue: '#5BC0EB',
  grassGreen: '#2EC4B6',
  candyPink: '#FF6B9D',
  starGold: '#FFC845',
  mathColor: '#FF8C42',
  chineseColor: '#2EC4B6',
  englishColor: '#5BC0EB',
  cardBg: '#FFFFFF',
  cardRadius: '28px',
  cardShadow: '0 12px 40px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
  btnRadius: '22px',
  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  textWhite: '#FFFFFF',
}

const SUBJECT_TABS: { key: Subject | 'all'; label: string; emoji: string; color: string }[] = [
  { key: 'all', label: '全部', emoji: '📚', color: T.sunOrange },
  { key: 'math', label: '数学', emoji: '🔢', color: T.mathColor },
  { key: 'chinese', label: '语文', emoji: '📖', color: T.chineseColor },
  { key: 'english', label: '英语', emoji: '🔤', color: T.englishColor },
]

const SUBJECT_COLORS: Record<Subject, string> = {
  math: 'linear-gradient(135deg, #FFE0C2 0%, #FFECD2 100%)',
  chinese: 'linear-gradient(135deg, #C8F7F1 0%, #DEFFF9 100%)',
  english: 'linear-gradient(135deg, #C8E9FA 0%, #E0F2FE 100%)',
}

const SUBJECT_TEXT_COLORS: Record<Subject, string> = {
  math: T.mathColor,
  chinese: T.chineseColor,
  english: T.englishColor,
}

const SUBJECT_LABELS: Record<Subject, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
}

export function LearningHistory() {
  const navigate = useNavigate()
  const currentChild = useChildStore((s) => s.currentChild)
  const [activeTab, setActiveTab] = useState<Subject | 'all'>('all')
  const [historyItems, setHistoryItems] = useState<HistoryListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const service = useMemo(() => new ReviewLearningService(), [])

  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      const childId = currentChild?.id
      if (!childId) return
      const params: { childId: string; subject?: Subject; limit?: number } = { childId, limit: 100 }
      if (activeTab !== 'all') params.subject = activeTab
      const items = await service.getHistory(params)
      // 双重保险：前端过滤掉无实质答题的记录（防御历史脏数据）
      setHistoryItems(items.filter(item => item.questionsCompleted > 0))
    } catch (err) {
      console.error('Failed to load history:', err)
      setHistoryItems([])
    } finally {
      setIsLoading(false)
    }
  }, [currentChild, activeTab, service])

  useEffect(() => { loadHistory() }, [loadHistory])

  const handleQuickReview = useCallback((item: HistoryListItem) => {
    navigate('/learn', {
      state: {
        reviewMode: 'quick-review', historyId: item.id,
        knowledgeNodeId: item.knowledgeNodeId, knowledgeNodeName: item.knowledgeNodeName,
        subject: item.subject,
      },
    })
  }, [navigate])

  const handleDeepRelearn = useCallback((item: HistoryListItem) => {
    navigate('/learn', {
      state: {
        reviewMode: 'deep-relearn',
        knowledgeNodeId: item.knowledgeNodeId, knowledgeNodeName: item.knowledgeNodeName,
        subject: item.subject,
      },
    })
  }, [navigate])

  return (
    <div
      data-testid="learning-history-page"
      style={{
        minHeight: '100vh', paddingBottom: '80px',
        background: T.bgGradient, fontFamily: T.fontBody,
      }}
    >
      {/* 顶部 */}
      <div style={{
        padding: '20px 24px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <h1 style={{
          fontSize: '26px', fontWeight: 'bold', color: T.textDark, margin: 0,
          fontFamily: T.fontDisplay,
        }}>
          📖 学习记录
        </h1>
      </div>

      {/* 科目筛选 Tabs */}
      <div style={{
        display: 'flex', gap: '8px', padding: '0 24px 16px',
        overflowX: 'auto',
      }}>
        {SUBJECT_TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 18px', borderRadius: '20px',
                border: isActive ? `2.5px solid ${tab.color}` : '2.5px solid transparent',
                backgroundColor: isActive ? `${tab.color}15` : T.cardBg,
                color: isActive ? tab.color : T.textLight,
                fontSize: '14px', fontWeight: isActive ? 'bold' : 'normal',
                fontFamily: T.fontBody, cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0,
                boxShadow: isActive ? `0 4px 12px ${tab.color}20` : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.emoji} {tab.label}
            </motion.button>
          )
        })}
      </div>

      {/* 内容区 */}
      <div style={{ padding: '0 24px' }}>
        {isLoading ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '12px', padding: '48px 0',
          }}>
            <motion.span
              style={{ fontSize: '48px' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              🌟
            </motion.span>
            <p style={{ color: T.textLight, fontSize: '15px', fontFamily: T.fontBody }}>
              加载中...
            </p>
          </div>
        ) : historyItems.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '12px', padding: '48px 0',
          }}>
            <motion.span
              style={{ fontSize: '56px' }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              📝
            </motion.span>
            <p style={{
              color: T.textMedium, fontSize: '17px', fontFamily: T.fontDisplay, fontWeight: 600,
            }}>
              还没有学习记录
            </p>
            <p style={{ color: T.textLight, fontSize: '13px', fontFamily: T.fontBody }}>
              完成课堂后会自动记录在这里 ✨
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {historyItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  style={{
                    padding: '18px', borderRadius: '22px',
                    backgroundColor: T.cardBg,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                  }}
                >
                  {/* 标题行 */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '12px',
                        background: SUBJECT_COLORS[item.subject],
                        fontSize: '12px', color: SUBJECT_TEXT_COLORS[item.subject],
                        fontWeight: 'bold', fontFamily: T.fontBody,
                      }}>
                        {SUBJECT_LABELS[item.subject]}
                      </span>
                      <span style={{
                        fontSize: '15px', fontWeight: 'bold', color: T.textDark,
                        fontFamily: T.fontBody,
                      }}>
                        {item.knowledgeNodeName}
                      </span>
                    </div>
                    {item.isReview && (
                      <span style={{
                        padding: '3px 10px', borderRadius: '10px',
                        backgroundColor: '#FFF3E7', fontSize: '11px',
                        color: T.sunOrange, fontWeight: 'bold',
                      }}>
                        复习
                      </span>
                    )}
                  </div>

                  {/* 课堂标题 */}
                  <p style={{
                    fontSize: '13px', color: T.textLight, margin: 0, lineHeight: 1.4,
                    fontFamily: T.fontBody,
                  }}>
                    {item.classroomTitle}
                  </p>

                  {/* 数据行 */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    fontSize: '13px', color: T.textLight, fontFamily: T.fontBody,
                  }}>
                    <span>📅 {item.date}</span>
                    <span>🎯 {item.accuracy}%</span>
                    <span>📝 {item.questionsCompleted}题</span>
                    <span>第{item.round}轮</span>
                  </div>

                  {/* 操作按钮 */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleQuickReview(item)}
                      style={{
                        flex: 1, padding: '11px 0', borderRadius: '16px',
                        border: `2px solid ${T.sunOrange}`,
                        backgroundColor: T.cardBg, color: T.sunOrange,
                        fontSize: '14px', fontWeight: 'bold',
                        fontFamily: T.fontDisplay, cursor: 'pointer',
                      }}
                    >
                      🔄 快速复习
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDeepRelearn(item)}
                      style={{
                        flex: 1, padding: '11px 0', borderRadius: '16px',
                        border: 'none',
                        background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
                        color: T.textWhite, fontSize: '14px', fontWeight: 'bold',
                        fontFamily: T.fontDisplay, cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(255, 140, 66, 0.25)',
                      }}
                    >
                      🧠 智能重学
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
