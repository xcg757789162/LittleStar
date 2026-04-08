/**
 * 家长仪表盘
 * 学习时长、完成量、正确率概览
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChildStore } from '@/stores/childStore'
import { db } from '@/db/database'

interface DailyStats {
  durationMinutes: number
  questionsCompleted: number
  accuracy: number
}

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ParentDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DailyStats>({
    durationMinutes: 0,
    questionsCompleted: 0,
    accuracy: 0,
  })

  useEffect(() => {
    async function loadStats() {
      try {
        const child = useChildStore.getState().currentChild
        if (!child) return

        const today = todayString()
        const sessions = await db.dailySessions
          .where('childId')
          .equals(child.id ?? '')
          .toArray()

        // 筛选今日的会话
        const todaySessions = sessions.filter((s) => s.date === today)

        if (todaySessions.length === 0) return

        // 聚合统计
        let totalMinutes = 0
        let totalQuestions = 0
        let totalCorrect = 0

        for (const session of todaySessions) {
          if (session.startTime && session.endTime) {
            const start = new Date(session.startTime).getTime()
            const end = new Date(session.endTime).getTime()
            totalMinutes += (end - start) / 60000
          }
          totalQuestions += session.questionsCompleted
          totalCorrect += session.correctCount
        }

        setStats({
          durationMinutes: Math.round(totalMinutes),
          questionsCompleted: totalQuestions,
          accuracy: totalQuestions > 0
            ? Math.round((totalCorrect / totalQuestions) * 100)
            : 0,
        })
      } catch {
        // 加载失败使用默认值
      }
    }

    loadStats()
  }, [])

  return (
    <div
      data-testid="parent-dashboard"
      style={{
        padding: '24px',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: '24px', color: '#333', marginBottom: '24px' }}>学习概览</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          data-testid="stat-duration"
          style={{
            padding: '20px',
            borderRadius: '16px',
            backgroundColor: '#E3F2FD',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1565C0' }}>
            {stats.durationMinutes}分
          </p>
          <p style={{ fontSize: '14px', color: '#666' }}>今日学习</p>
        </div>
        <div
          data-testid="stat-completed"
          style={{
            padding: '20px',
            borderRadius: '16px',
            backgroundColor: '#E8F5E9',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#2E7D32' }}>
            {stats.questionsCompleted}题
          </p>
          <p style={{ fontSize: '14px', color: '#666' }}>完成题数</p>
        </div>
        <div
          data-testid="stat-accuracy"
          style={{
            padding: '20px',
            borderRadius: '16px',
            backgroundColor: '#FFF3E0',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#E65100' }}>
            {stats.accuracy}%
          </p>
          <p style={{ fontSize: '14px', color: '#666' }}>正确率</p>
        </div>
      </div>

      {/* 学习报告入口 */}
      <button
        data-testid="reports-btn"
        onClick={() => navigate('/reports')}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #E0E0E0',
          backgroundColor: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '16px',
          color: '#333',
        }}
      >
        <span>📊 学习报告</span>
        <span style={{ color: '#999' }}>→</span>
      </button>
    </div>
  )
}
