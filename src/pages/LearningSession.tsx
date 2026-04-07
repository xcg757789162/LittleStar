/**
 * 每日学习流程页面
 * 整合闪卡/选择题/手写板组件，连接自适应引擎和 store
 */

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { Subject } from '@/types/models'

const SUBJECTS: { key: Subject; label: string; emoji: string; color: string }[] = [
  { key: 'math', label: '数学', emoji: '🔢', color: '#E3F2FD' },
  { key: 'chinese', label: '语文', emoji: '📖', color: '#FFF3E0' },
  { key: 'english', label: '英语', emoji: '🔤', color: '#E8F5E9' },
]

export function LearningSession() {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [isStarted, setIsStarted] = useState(false)

  const handleStart = useCallback(() => {
    if (selectedSubject) {
      setIsStarted(true)
    }
  }, [selectedSubject])

  const handleExit = useCallback(() => {
    setIsStarted(false)
    setSelectedSubject(null)
  }, [])

  return (
    <div
      data-testid="learning-session"
      style={{
        minHeight: '100vh',
        padding: '24px',
        background: 'linear-gradient(180deg, #E8EAF6 0%, #F3E5F5 100%)',
      }}
    >
      {/* 顶部栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div data-testid="session-progress" style={{ fontSize: '16px', color: '#666' }}>
          {isStarted
            ? `正在学习 ${SUBJECTS.find((s) => s.key === selectedSubject)?.label ?? ''}`
            : '选择要学习的科目'}
        </div>
        <button
          data-testid="exit-button"
          onClick={handleExit}
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            border: '2px solid #BDBDBD',
            backgroundColor: '#F5F5F5',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          退出
        </button>
      </div>

      {/* 科目选择（未开始时） */}
      {!isStarted && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '16px',
            }}
          >
            今天想学什么？
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
              width: '100%',
              maxWidth: '480px',
            }}
          >
            {SUBJECTS.map((subject) => (
              <motion.button
                key={subject.key}
                onClick={() => setSelectedSubject(subject.key)}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '20px 12px',
                  borderRadius: '20px',
                  border:
                    selectedSubject === subject.key
                      ? '3px solid #7C4DFF'
                      : '3px solid transparent',
                  backgroundColor: subject.color,
                  cursor: 'pointer',
                  boxShadow: selectedSubject === subject.key
                    ? '0 4px 12px rgba(124, 77, 255, 0.3)'
                    : 'none',
                }}
              >
                <span style={{ fontSize: '40px', marginBottom: '8px' }}>
                  {subject.emoji}
                </span>
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#333',
                  }}
                >
                  {subject.label}
                </span>
              </motion.button>
            ))}
          </div>

          <motion.button
            onClick={handleStart}
            disabled={!selectedSubject}
            whileTap={selectedSubject ? { scale: 0.95 } : undefined}
            style={{
              marginTop: '24px',
              padding: '16px 48px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: selectedSubject ? '#7C4DFF' : '#BDBDBD',
              color: 'white',
              fontSize: '22px',
              fontWeight: 'bold',
              cursor: selectedSubject ? 'pointer' : 'default',
              opacity: selectedSubject ? 1 : 0.6,
            }}
          >
            开始学习
          </motion.button>
        </div>
      )}

      {/* 学习中（开始后） */}
      {isStarted && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <p
            style={{
              fontSize: '20px',
              color: '#666',
              textAlign: 'center',
            }}
          >
            学习进行中...
          </p>
          {/* 这里将来会根据题目类型动态渲染 FlashCard / MultipleChoice / WritingPad */}
        </div>
      )}
    </div>
  )
}
