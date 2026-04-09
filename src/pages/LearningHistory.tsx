/**
 * 学习历史页面
 * 展示孩子已完成的课堂记录，支持按科目筛选
 * 每条记录提供"快速复习"（原样回放）和"智能重学"（AI重新生成）两种操作
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useChildStore } from '@/stores/childStore'
import { ReviewLearningService, type HistoryListItem } from '@/services/review-learning'
import type { Subject } from '@/types/models'

const SUBJECT_TABS: { key: Subject | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: '全部', emoji: '📚' },
  { key: 'math', label: '数学', emoji: '🔢' },
  { key: 'chinese', label: '语文', emoji: '📖' },
  { key: 'english', label: '英语', emoji: '🔤' },
]

const SUBJECT_COLORS: Record<Subject, string> = {
  math: '#E3F2FD',
  chinese: '#FFF3E0',
  english: '#E8F5E9',
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

  // 加载学习历史
  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      const childId = currentChild?.id
      if (!childId) return
      const params: { childId: string; subject?: Subject; limit?: number } = {
        childId,
        limit: 100,
      }
      if (activeTab !== 'all') {
        params.subject = activeTab
      }
      const items = await service.getHistory(params)
      setHistoryItems(items)
    } catch (err) {
      console.error('Failed to load history:', err)
      setHistoryItems([])
    } finally {
      setIsLoading(false)
    }
  }, [currentChild, activeTab, service])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // 快速复习
  const handleQuickReview = useCallback(
    (item: HistoryListItem) => {
      navigate('/learn', {
        state: {
          reviewMode: 'quick-review',
          historyId: item.id,
          knowledgeNodeId: item.knowledgeNodeId,
          knowledgeNodeName: item.knowledgeNodeName,
          subject: item.subject,
        },
      })
    },
    [navigate],
  )

  // 智能重学
  const handleDeepRelearn = useCallback(
    (item: HistoryListItem) => {
      navigate('/learn', {
        state: {
          reviewMode: 'deep-relearn',
          knowledgeNodeId: item.knowledgeNodeId,
          knowledgeNodeName: item.knowledgeNodeName,
          subject: item.subject,
        },
      })
    },
    [navigate],
  )

  return (
    <div
      data-testid="learning-history-page"
      style={{
        minHeight: '100vh',
        paddingBottom: '72px',
        background: 'linear-gradient(180deg, #E8EAF6 0%, #F3E5F5 100%)',
      }}
    >
      {/* 顶部 */}
      <div
        style={{
          padding: '20px 24px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', margin: 0 }}>
          📖 学习记录
        </h1>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '6px 16px',
            borderRadius: '12px',
            border: '2px solid #BDBDBD',
            backgroundColor: '#F5F5F5',
            fontSize: '14px',
            cursor: 'pointer',
            color: '#666',
          }}
        >
          返回
        </button>
      </div>

      {/* 科目筛选 Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '0 24px 16px',
          overflowX: 'auto',
        }}
      >
        {SUBJECT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: activeTab === tab.key ? '2px solid #7C4DFF' : '2px solid transparent',
              backgroundColor: activeTab === tab.key ? '#EDE7F6' : 'white',
              color: activeTab === tab.key ? '#7C4DFF' : '#666',
              fontSize: '14px',
              fontWeight: activeTab === tab.key ? 'bold' : 'normal',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div style={{ padding: '0 24px' }}>
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '48px 0',
            }}
          >
            <motion.span
              style={{ fontSize: '40px' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              🌟
            </motion.span>
            <p style={{ color: '#999', fontSize: '14px' }}>加载中...</p>
          </div>
        ) : historyItems.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '48px 0',
            }}
          >
            <span style={{ fontSize: '48px' }}>📝</span>
            <p style={{ color: '#999', fontSize: '16px' }}>还没有学习记录</p>
            <p style={{ color: '#BBB', fontSize: '13px' }}>完成课堂后会自动记录在这里</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {historyItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    backgroundColor: 'white',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {/* 标题行 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          padding: '2px 10px',
                          borderRadius: '10px',
                          backgroundColor: SUBJECT_COLORS[item.subject],
                          fontSize: '12px',
                          color: '#555',
                          fontWeight: 'bold',
                        }}
                      >
                        {SUBJECT_LABELS[item.subject]}
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#333' }}>
                        {item.knowledgeNodeName}
                      </span>
                    </div>
                    {item.isReview && (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '8px',
                          backgroundColor: '#FFF3E0',
                          fontSize: '11px',
                          color: '#F57C00',
                          fontWeight: 'bold',
                        }}
                      >
                        复习
                      </span>
                    )}
                  </div>

                  {/* 课堂标题 */}
                  <p style={{ fontSize: '13px', color: '#888', margin: 0, lineHeight: 1.4 }}>
                    {item.classroomTitle}
                  </p>

                  {/* 数据行 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      fontSize: '13px',
                      color: '#999',
                    }}
                  >
                    <span>📅 {item.date}</span>
                    <span>🎯 {item.accuracy}%</span>
                    <span>📝 {item.questionsCompleted}题</span>
                    <span>第{item.round}轮</span>
                  </div>

                  {/* 操作按钮 */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '4px',
                    }}
                  >
                    <button
                      onClick={() => handleQuickReview(item)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: '12px',
                        border: '2px solid #7C4DFF',
                        backgroundColor: 'white',
                        color: '#7C4DFF',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      🔄 快速复习
                    </button>
                    <button
                      onClick={() => handleDeepRelearn(item)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: '#7C4DFF',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      🧠 智能重学
                    </button>
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
