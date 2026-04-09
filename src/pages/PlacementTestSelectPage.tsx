/**
 * 入学评测科目选择页面
 * 展示三个科目卡片，用户可以自由选择先测哪个
 * 已完成的科目显示已完成状态
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useChildStore } from '@/stores/childStore'
import { usePlacementTests } from '@/hooks/queries'
import type { Subject } from '@/types/models'

const SUBJECTS: {
  key: Subject
  label: string
  emoji: string
  color: string
  bgColor: string
  description: string
}[] = [
  {
    key: 'math',
    label: '数学',
    emoji: '🔢',
    color: '#FF6B35',
    bgColor: '#FFF3E0',
    description: '数字、计算、图形',
  },
  {
    key: 'chinese',
    label: '语文',
    emoji: '📖',
    color: '#4CAF50',
    bgColor: '#E8F5E9',
    description: '识字、拼音、阅读',
  },
  {
    key: 'english',
    label: '英语',
    emoji: '🌍',
    color: '#2196F3',
    bgColor: '#E3F2FD',
    description: '字母、单词、对话',
  },
]

export function PlacementTestSelectPage() {
  const navigate = useNavigate()
  const currentChild = useChildStore((s) => s.currentChild)
  const childId = currentChild?.id
  const gradeLevel = currentChild?.gradeLevel ?? 'middle-kindergarten'

  const { data: placementTests, isLoading, isError, refetch } = usePlacementTests(childId)
  const [completedSubjects, setCompletedSubjects] = useState<Set<Subject>>(new Set())

  useEffect(() => {
    if (placementTests) {
      setCompletedSubjects(new Set(placementTests.map((t) => t.subject as Subject)))
    }
  }, [placementTests])

  const allCompleted = completedSubjects.size >= 3

  // 如果三科都完成了，自动跳转回首页
  useEffect(() => {
    if (allCompleted) {
      const timer = setTimeout(() => navigate('/', { replace: true }), 2000)
      return () => clearTimeout(timer)
    }
  }, [allCompleted, navigate])

  const handleSelectSubject = (subject: Subject) => {
    if (completedSubjects.has(subject)) return
    navigate(`/placement-test/${subject}/${gradeLevel}`)
  }

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #E8EAF6 0%, #F3E5F5 100%)',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{ fontSize: '48px' }}
        >
          🌟
        </motion.div>
      </div>
    )
  }

  if (isError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #E8EAF6 0%, #F3E5F5 100%)',
          padding: '24px',
          gap: '16px',
        }}
      >
        <div style={{ fontSize: '64px' }}>😥</div>
        <h2 style={{ fontSize: '20px', color: '#D32F2F', fontWeight: 'bold' }}>
          后端服务连接失败
        </h2>
        <p style={{ fontSize: '14px', color: '#999', textAlign: 'center', maxWidth: '320px' }}>
          无法加载评测记录，请检查 Docker 后端服务是否正在运行
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => refetch()}
            style={{
              padding: '14px 36px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: '#7C4DFF',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            🔄 重试
          </motion.button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '14px 24px',
              borderRadius: '20px',
              border: '1px solid #E0E0E0',
              backgroundColor: 'transparent',
              color: '#999',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'linear-gradient(180deg, #E8EAF6 0%, #F3E5F5 100%)',
        padding: '24px',
        paddingTop: '48px',
      }}
    >
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/')}
        style={{
          alignSelf: 'flex-start',
          padding: '8px 16px',
          fontSize: '14px',
          color: '#999',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        ← 返回首页
      </button>

      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '32px',
        }}
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ fontSize: '60px' }}
        >
          🌟
        </motion.div>
        <h1
          style={{
            fontSize: '24px',
            color: '#7C4DFF',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          选择你想先测试的科目
        </h1>
        <p style={{ fontSize: '14px', color: '#999', textAlign: 'center' }}>
          每个科目只需几分钟 ☺️
        </p>

        {/* 进度指示器 */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '8px',
          }}
        >
          {SUBJECTS.map((s) => (
            <div
              key={s.key}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: completedSubjects.has(s.key)
                  ? '#4CAF50'
                  : 'rgba(124, 77, 255, 0.2)',
                transition: 'background-color 0.3s ease',
              }}
            />
          ))}
        </div>
        <p style={{ fontSize: '12px', color: '#aaa' }}>
          已完成 {completedSubjects.size} / 3 科
        </p>
      </motion.div>

      {/* 全部完成提示 */}
      {allCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '24px',
          }}
        >
          <div style={{ fontSize: '60px' }}>🎉</div>
          <h2 style={{ fontSize: '22px', color: '#7C4DFF', fontWeight: 'bold' }}>
            三科评测都完成啦！
          </h2>
          <p style={{ fontSize: '14px', color: '#999' }}>正在跳转到首页...</p>
        </motion.div>
      )}

      {/* 科目卡片列表 */}
      {!allCompleted && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            width: '100%',
            maxWidth: '400px',
          }}
        >
          {SUBJECTS.map((subject, index) => {
            const isCompleted = completedSubjects.has(subject.key)
            return (
              <motion.button
                key={subject.key}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15 }}
                whileTap={isCompleted ? {} : { scale: 0.97 }}
                whileHover={isCompleted ? {} : { scale: 1.02 }}
                onClick={() => handleSelectSubject(subject.key)}
                disabled={isCompleted}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px 24px',
                  borderRadius: '20px',
                  border: isCompleted
                    ? '2px solid #E0E0E0'
                    : `2px solid ${subject.color}`,
                  backgroundColor: isCompleted
                    ? '#F5F5F5'
                    : subject.bgColor,
                  cursor: isCompleted ? 'default' : 'pointer',
                  opacity: isCompleted ? 0.6 : 1,
                  boxShadow: isCompleted
                    ? 'none'
                    : `0 4px 16px ${subject.color}33`,
                  position: 'relative',
                  overflow: 'hidden',
                  textAlign: 'left',
                }}
              >
                {/* Emoji 图标 */}
                <div
                  style={{
                    fontSize: '40px',
                    flexShrink: 0,
                    filter: isCompleted ? 'grayscale(0.5)' : 'none',
                  }}
                >
                  {isCompleted ? '✅' : subject.emoji}
                </div>

                {/* 文字内容 */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: isCompleted ? '#999' : subject.color,
                      marginBottom: '4px',
                    }}
                  >
                    {subject.label}
                    {isCompleted && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 'normal',
                          color: '#4CAF50',
                          marginLeft: '8px',
                        }}
                      >
                        已完成
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: isCompleted ? '#bbb' : '#888',
                    }}
                  >
                    {subject.description}
                  </div>
                </div>

                {/* 箭头 */}
                {!isCompleted && (
                  <div
                    style={{
                      fontSize: '20px',
                      color: subject.color,
                      opacity: 0.6,
                    }}
                  >
                    →
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
