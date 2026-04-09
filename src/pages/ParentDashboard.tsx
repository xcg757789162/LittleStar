/**
 * 家长仪表盘
 * 学习时长、完成量、正确率概览
 * 分层配置：基础展示层（无需密码）+ 高级配置层（PIN 解锁）
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChildStore } from '@/stores/childStore'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/services/api'
import { ClassroomCache } from '@/services/openmaic/cache'
import { PostgresCacheStore } from '@/services/openmaic/postgres-cache-store'
import { OpenMAICClient } from '@/services/openmaic/client'
import { PinVerification } from '@/components/parent/PinVerification'

import type { Subject, DailySession, KnowledgeNode, MasteryRecord } from '@/types/models'

/** localStorage key for parent PIN */
const PIN_STORAGE_KEY = 'littlestar_parent_pin'

/** localStorage keys for OpenMAIC 配置 */
const OPENMAIC_URL_KEY = 'littlestar_openmaic_url'
const OPENMAIC_API_KEY_KEY = 'littlestar_openmaic_api_key'

/** 各学科掌握率 */
interface SubjectMastery {
  subject: Subject
  label: string
  emoji: string
  color: string
  mastery: number
}

/** 学科配置 */
const SUBJECT_CONFIG: Omit<SubjectMastery, 'mastery'>[] = [
  { subject: 'math', label: '数学', emoji: '🔢', color: '#1565C0' },
  { subject: 'chinese', label: '语文', emoji: '📖', color: '#C62828' },
  { subject: 'english', label: '英语', emoji: '🌍', color: '#2E7D32' },
]

interface DailyStats {
  durationMinutes: number
  questionsCompleted: number
  accuracy: number
}

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 共享的信息卡片基础样式 */
const infoCardStyle = {
  padding: '16px',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
} as const

/** 共享的操作按钮基础样式 */
const actionBtnStyle = {
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
} as const

export function ParentDashboard() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState<DailyStats>({
    durationMinutes: 0,
    questionsCompleted: 0,
    accuracy: 0,
  })

  // 分层配置状态
  const [cachedCount, setCachedCount] = useState(0)
  const [showPinVerify, setShowPinVerify] = useState(false)
  const [isAdvancedUnlocked, setIsAdvancedUnlocked] = useState(false)
  const [savedPin, setSavedPin] = useState<string | null>(() => {
    try { return localStorage.getItem(PIN_STORAGE_KEY) } catch { return null }
  })
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null)
  const [subjectMasteries, setSubjectMasteries] = useState<SubjectMastery[]>([])
  const [apiError, setApiError] = useState(false)

  // 高级配置表单状态
  const [openmaicUrl, setOpenmaicUrl] = useState(() => {
    try { return localStorage.getItem(OPENMAIC_URL_KEY) ?? 'http://localhost:3000' } catch { return 'http://localhost:3000' }
  })
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem(OPENMAIC_API_KEY_KEY) ?? '' } catch { return '' }
  })
  const [configSaved, setConfigSaved] = useState(false)

  // M1: 惰性初始化 refs，避免每次渲染创建新实例
  const cacheRef = useRef<ClassroomCache | null>(null)
  if (cacheRef.current == null) {
    const child = useChildStore.getState().currentChild
    cacheRef.current = child
      ? new ClassroomCache(new PostgresCacheStore(Number(child.id)))
      : new ClassroomCache()
  }
  const clientRef = useRef<OpenMAICClient | null>(null)
  if (clientRef.current == null) clientRef.current = new OpenMAICClient()

  // 加载学习统计
  useEffect(() => {
    async function loadStats() {
      try {
        const child = useChildStore.getState().currentChild
        if (!child) return

        const today = todayString()
        const sessions = await apiClient.get<DailySession>('/daily_sessions', {
          filters: [{ column: 'childId', operator: 'eq', value: Number(child.id) }],
        })

        // 从 API 返回的所有 session 中过滤出今日的
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
        // API 加载失败，标记后端连接问题
        setApiError(true)
      }
    }

    loadStats()
  }, [])

  // 加载缓存课程数量
  useEffect(() => {
    async function loadCacheStatus() {
      try {
        const size = await cacheRef.current!.getCacheSize()
        setCachedCount(size)
      } catch {
        // 缓存加载失败使用默认值
      }
    }

    loadCacheStatus()
  }, [])

  // 检查 OpenMAIC 服务健康状态
  useEffect(() => {
    async function checkServiceHealth() {
      try {
        const isHealthy = await clientRef.current!.checkHealth()
        setServiceOnline(isHealthy)
      } catch {
        setServiceOnline(false)
      }
    }

    checkServiceHealth()
  }, [])

  // I1: 加载各学科掌握率
  useEffect(() => {
    async function loadSubjectMasteries() {
      try {
        const child = useChildStore.getState().currentChild
        if (!child) return

        const masteryData: SubjectMastery[] = []
        for (const config of SUBJECT_CONFIG) {
          // 查询该学科下所有知识点的掌握率记录
          const nodes = await apiClient.get<KnowledgeNode>('/knowledge_nodes', {
            filters: [{ column: 'subject', operator: 'eq', value: config.subject }],
          })
          const nodeIds = nodes.map((n) => n.id).filter(Boolean) as string[]

          if (nodeIds.length === 0) {
            masteryData.push({ ...config, mastery: 0 })
            continue
          }

          // 获取该孩子在这些知识点上的掌握率记录
          const records = await apiClient.get<MasteryRecord>('/mastery_records', {
            filters: [{ column: 'childId', operator: 'eq', value: Number(child.id) }],
          })
          const subjectRecords = records.filter((r) => nodeIds.includes(r.knowledgeNodeId))

          if (subjectRecords.length === 0) {
            masteryData.push({ ...config, mastery: 0 })
            continue
          }

          // 计算平均掌握率
          const avgMastery = Math.round(
            subjectRecords.reduce((sum, r) => sum + r.masteryLevel, 0) / subjectRecords.length,
          )
          masteryData.push({ ...config, mastery: avgMastery })
        }

        setSubjectMasteries(masteryData)
      } catch {
        // 加载失败使用空数组
      }
    }

    loadSubjectMasteries()
  }, [])

  // PIN 验证回调
  const handlePinVerify = useCallback((isCorrect: boolean) => {
    if (isCorrect) {
      setIsAdvancedUnlocked(true)
      setShowPinVerify(false)
    }
  }, [])

  // PIN 设置完成回调（setup 模式）
  const handleSetPin = useCallback((pin: string) => {
    try {
      localStorage.setItem(PIN_STORAGE_KEY, pin)
      setSavedPin(pin)
    } catch {
      // localStorage 不可用时忽略持久化
    }
  }, [])

  const handlePinCancel = useCallback(() => {
    setShowPinVerify(false)
  }, [])

  // I4: 保存高级配置
  const handleSaveConfig = useCallback(() => {
    try {
      localStorage.setItem(OPENMAIC_URL_KEY, openmaicUrl)
      localStorage.setItem(OPENMAIC_API_KEY_KEY, apiKey)
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 2000)
    } catch {
      // localStorage 不可用时忽略
    }
  }, [openmaicUrl, apiKey])

  return (
    <div
      data-testid="parent-dashboard"
      style={{
        padding: '24px',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', color: '#333', margin: 0 }}>学习概览</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#999' }}>👤 {user?.nickname ?? '用户'}</span>
          <button
            data-testid="header-logout-btn"
            onClick={() => {
              if (window.confirm('确定要退出登录吗？')) {
                logout()
              }
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid #FFCDD2',
              backgroundColor: '#FFF5F5',
              color: '#D32F2F',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            退出
          </button>
        </div>
      </div>

      {/* 后端 API 连接失败提示 */}
      {apiError && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: '#FFF3E0',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span style={{ fontSize: '13px', color: '#E65100', flex: 1 }}>
            后端数据服务连接失败，以下数据可能不准确
          </span>
        </div>
      )}

      {/* 统计卡片 */}
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

      {/* 基础展示层：OpenMAIC 服务状态 */}
      <div
        data-testid="service-status"
        style={{
          ...infoCardStyle,
          backgroundColor: serviceOnline === false ? '#FFEBEE' : '#F3E5F5',
          marginBottom: '12px',
        }}
      >
        <span style={{ fontSize: '16px' }}>{serviceOnline === null ? '⏳' : serviceOnline ? '🤖' : '⚠️'}</span>
        <span style={{ fontSize: '14px', color: serviceOnline === false ? '#D32F2F' : '#6A1B9A' }}>
          {serviceOnline === null
            ? 'OpenMAIC 服务检测中...'
            : serviceOnline
              ? 'OpenMAIC 服务已就绪'
              : 'OpenMAIC 服务离线'}
        </span>
      </div>

      {/* 基础展示层：缓存课程数 */}
      <div
        data-testid="cache-info"
        style={{
          ...infoCardStyle,
          backgroundColor: '#E0F7FA',
          marginBottom: '12px',
        }}
      >
        <span style={{ fontSize: '16px' }}>📚</span>
        <span style={{ fontSize: '14px', color: '#00695C' }}>
          已缓存 {cachedCount} 节课程
        </span>
      </div>

      {/* I1: 基础展示层：各学科掌握率 */}
      {subjectMasteries.length > 0 && (
        <div
          data-testid="subject-masteries"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          {subjectMasteries.map((sm) => (
            <div
              key={sm.subject}
              data-testid={`mastery-${sm.subject}`}
              style={{
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: '#F5F5F5',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '20px', margin: '0 0 4px' }}>{sm.emoji}</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: sm.color, margin: '0 0 2px' }}>
                {sm.mastery}%
              </p>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>{sm.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* 学习报告入口 */}
      <button
        data-testid="reports-btn"
        onClick={() => navigate('/reports')}
        style={{
          ...actionBtnStyle,
          marginBottom: '12px',
        }}
      >
        <span>📊 学习报告</span>
        <span style={{ color: '#999' }}>→</span>
      </button>

      {/* 高级设置入口 */}
      <button
        data-testid="advanced-settings-btn"
        onClick={() => {
          if (!isAdvancedUnlocked) {
            setShowPinVerify(true)
          }
        }}
        style={{
          ...actionBtnStyle,
          marginBottom: '24px',
        }}
      >
        <span>⚙️ 高级设置</span>
        <span style={{ color: '#999' }}>{isAdvancedUnlocked ? '✓' : '🔒'}</span>
      </button>

      {/* PIN 验证弹出层 */}
      {showPinVerify && (
        <PinVerification
          correctPin={savedPin ?? ''}
          mode={savedPin ? 'verify' : 'setup'}
          onVerify={handlePinVerify}
          onCancel={handlePinCancel}
          onSetPin={handleSetPin}
          maxAttempts={5}
        />
      )}

      {/* 高级配置区域：PIN 验证通过后显示 */}
      {isAdvancedUnlocked && (
        <div
          data-testid="advanced-config"
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #E0E0E0',
            backgroundColor: '#FAFAFA',
          }}
        >
          <h2 style={{ fontSize: '18px', color: '#333', marginBottom: '16px' }}>高级配置</h2>

          {/* OpenMAIC 服务地址 */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="openmaic-url"
              style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '6px' }}
            >
              OpenMAIC 服务地址
            </label>
            <input
              id="openmaic-url"
              data-testid="config-openmaic-url"
              type="text"
              value={openmaicUrl}
              onChange={(e) => setOpenmaicUrl(e.target.value)}
              placeholder="http://localhost:3000"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #E0E0E0',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* API Key */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="api-key"
              style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '6px' }}
            >
              API Key
            </label>
            <input
              id="api-key"
              data-testid="config-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入 API Key"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #E0E0E0',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 保存按钮 */}
          <button
            data-testid="config-save-btn"
            onClick={handleSaveConfig}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: configSaved ? '#4CAF50' : '#7C4DFF',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {configSaved ? '✓ 已保存' : '保存配置'}
          </button>
        </div>
      )}

      {/* 退出登录 */}
      <button
        data-testid="logout-btn"
        onClick={() => {
          if (window.confirm('确定要退出登录吗？')) {
            logout()
          }
        }}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          border: '1px solid #FFCDD2',
          backgroundColor: '#fff',
          color: '#D32F2F',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginTop: '24px',
          marginBottom: '32px',
        }}
      >
        退出登录
      </button>
    </div>
  )
}
