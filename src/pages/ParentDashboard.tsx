/**
 * 家长仪表盘 — Sunny Playground 风格
 * 学习时长、完成量、正确率概览
 * 分层配置：基础展示层（无需密码）+ 高级配置层（PIN 解锁）
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useChildStore } from '@/stores/childStore'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/services/api'
import { ClassroomCache } from '@/services/openmaic/cache'
import { PostgresCacheStore } from '@/services/openmaic/postgres-cache-store'
import { OpenMAICClient } from '@/services/openmaic/client'
import { PinVerification } from '@/components/parent/PinVerification'

import type { Subject, DailySession, KnowledgeNode, MasteryRecord } from '@/types/models'

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
  cardBg: '#FFFFFF',
  cardRadius: '28px',
  cardShadow: '0 12px 40px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
  btnRadius: '22px',
  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  textWhite: '#FFFFFF',
  errorRed: '#FF6B6B',
  warningAmber: '#FFB347',
}

// ===== 多提供商配置体系（从 config.ts 统一导入） =====
import {
  SERVICE_TYPES,
  getProvidersForService,
  getSelectedProviderId,
  setSelectedProviderId,
  getProviderConfig,
  setProviderConfig,
  migrateOldConfig,
  type ServiceType,
} from '@/services/config'

// 首次加载时自动迁移旧配置
migrateOldConfig()

interface SubjectMastery {
  subject: Subject; label: string; emoji: string; color: string; mastery: number
}

const SUBJECT_CONFIG: Omit<SubjectMastery, 'mastery'>[] = [
  { subject: 'math', label: '数学', emoji: '🔢', color: T.sunOrange },
  { subject: 'chinese', label: '语文', emoji: '📖', color: T.grassGreen },
  { subject: 'english', label: '英语', emoji: '🌍', color: T.skyBlue },
]

interface DailyStats { durationMinutes: number; questionsCompleted: number; accuracy: number }

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ParentDashboard() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState<DailyStats>({ durationMinutes: 0, questionsCompleted: 0, accuracy: 0 })
  const [cachedCount, setCachedCount] = useState(0)
  const [showPinVerify, setShowPinVerify] = useState(false)
  const [isAdvancedUnlocked, setIsAdvancedUnlocked] = useState(false)
  const [savedPin, setSavedPin] = useState<string | null>(() => user?.parentPin ?? null)
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null)
  const [subjectMasteries, setSubjectMasteries] = useState<SubjectMastery[]>([])
  const [apiError, setApiError] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  // 多提供商配置：每个功能类型选中的 provider + provider 字段值
  const [selectedProviders, setSelectedProviders] = useState<Record<ServiceType, string>>(() => ({
    llm: getSelectedProviderId('llm'),
    tts: getSelectedProviderId('tts'),
    stt: getSelectedProviderId('stt'),
    ise: getSelectedProviderId('ise'),
  }))
  // provider 字段值缓存：{ providerId: { fieldName: value } }
  const [providerConfigs, setProviderConfigs] = useState<Record<string, Record<string, string>>>(() => {
    const result: Record<string, Record<string, string>> = {}
    for (const st of SERVICE_TYPES) {
      for (const provider of getProvidersForService(st.type)) {
        result[provider.id] = getProviderConfig(provider.id)
      }
    }
    return result
  })
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const cacheRef = useRef<ClassroomCache | null>(null)
  if (cacheRef.current == null) {
    const child = useChildStore.getState().currentChild
    cacheRef.current = child
      ? new ClassroomCache(new PostgresCacheStore(Number(child.id)))
      : new ClassroomCache()
  }
  const clientRef = useRef<OpenMAICClient | null>(null)
  if (clientRef.current == null) clientRef.current = new OpenMAICClient()

  useEffect(() => {
    async function loadStats() {
      try {
        const child = useChildStore.getState().currentChild
        if (!child) return
        const today = todayString()
        const sessions = await apiClient.get<DailySession>('/daily_sessions', {
          filters: [{ column: 'childId', operator: 'eq', value: Number(child.id) }],
        })
        const todaySessions = sessions.filter((s) => s.date === today)
        if (todaySessions.length === 0) return
        let totalMinutes = 0, totalQuestions = 0, totalCorrect = 0
        for (const session of todaySessions) {
          if (session.startTime && session.endTime) {
            totalMinutes += (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000
          }
          totalQuestions += session.questionsCompleted
          totalCorrect += session.correctCount
        }
        setStats({
          durationMinutes: Math.round(totalMinutes),
          questionsCompleted: totalQuestions,
          accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
        })
      } catch { setApiError(true) }
    }
    loadStats()
  }, [])

  useEffect(() => {
    async function loadCacheStatus() {
      try { setCachedCount(await cacheRef.current!.getCacheSize()) } catch { /* ignore */ }
    }
    loadCacheStatus()
  }, [])

  // 页面可见性变化时刷新统计数据和缓存（从其他页面切回来时触发）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 刷新统计
        const loadStats = async () => {
          try {
            const child = useChildStore.getState().currentChild
            if (!child) return
            const today = todayString()
            const sessions = await apiClient.get<DailySession>('/daily_sessions', {
              filters: [{ column: 'childId', operator: 'eq', value: Number(child.id) }],
            })
            const todaySessions = sessions.filter((s) => s.date === today)
            if (todaySessions.length === 0) {
              setStats({ durationMinutes: 0, questionsCompleted: 0, accuracy: 0 })
              return
            }
            let totalMinutes = 0, totalQuestions = 0, totalCorrect = 0
            for (const session of todaySessions) {
              if (session.startTime && session.endTime) {
                totalMinutes += (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000
              }
              totalQuestions += session.questionsCompleted
              totalCorrect += session.correctCount
            }
            setStats({
              durationMinutes: Math.round(totalMinutes),
              questionsCompleted: totalQuestions,
              accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
            })
          } catch { /* ignore */ }
        }
        void loadStats()
        // 刷新缓存数量
        cacheRef.current?.getCacheSize().then(setCachedCount).catch(() => {})
        // 刷新学科掌握率
        const loadMasteries = async () => {
          try {
            const child = useChildStore.getState().currentChild
            if (!child) return
            const masteryData: SubjectMastery[] = []
            for (const config of SUBJECT_CONFIG) {
              const nodes = await apiClient.get<KnowledgeNode>('/knowledge_nodes', {
                filters: [{ column: 'subject', operator: 'eq', value: config.subject }],
              })
              const nodeIds = nodes.map((n) => n.id).filter(Boolean) as string[]
              if (nodeIds.length === 0) { masteryData.push({ ...config, mastery: 0 }); continue }
              const records = await apiClient.get<MasteryRecord>('/mastery_records', {
                filters: [{ column: 'childId', operator: 'eq', value: Number(child.id) }],
              })
              const subjectRecords = records.filter((r) => nodeIds.includes(r.knowledgeNodeId))
              if (subjectRecords.length === 0) { masteryData.push({ ...config, mastery: 0 }); continue }
              const avgMastery = Math.round(subjectRecords.reduce((sum, r) => sum + r.masteryLevel, 0) / subjectRecords.length)
              masteryData.push({ ...config, mastery: avgMastery })
            }
            setSubjectMasteries(masteryData)
          } catch { /* ignore */ }
        }
        void loadMasteries()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // 课堂完成事件监听：学完课堂后自动刷新统计数据和缓存数量
  useEffect(() => {
    const handleClassroomCompleted = () => {
      // 延迟 3 秒刷新，等待 onSessionEnd 的 DB 写入完成
      setTimeout(() => {
        // 刷新统计
        const loadStats = async () => {
          try {
            const child = useChildStore.getState().currentChild
            if (!child) return
            const today = todayString()
            const sessions = await apiClient.get<DailySession>('/daily_sessions', {
              filters: [{ column: 'childId', operator: 'eq', value: Number(child.id) }],
            })
            const todaySessions = sessions.filter((s) => s.date === today)
            if (todaySessions.length === 0) return
            let totalMinutes = 0, totalQuestions = 0, totalCorrect = 0
            for (const session of todaySessions) {
              if (session.startTime && session.endTime) {
                totalMinutes += (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000
              }
              totalQuestions += session.questionsCompleted
              totalCorrect += session.correctCount
            }
            setStats({
              durationMinutes: Math.round(totalMinutes),
              questionsCompleted: totalQuestions,
              accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
            })
          } catch { /* ignore */ }
        }
        void loadStats()
        // 刷新缓存数量
        cacheRef.current?.getCacheSize().then(setCachedCount).catch(() => {})
      }, 3000)
    }

    window.addEventListener('classroom-completed', handleClassroomCompleted)
    return () => window.removeEventListener('classroom-completed', handleClassroomCompleted)
  }, [])

  const checkServiceHealth = useCallback(async () => {
    setServiceOnline(null)
    try { setServiceOnline(await clientRef.current!.checkHealth()) } catch { setServiceOnline(false) }
  }, [])

  useEffect(() => { checkServiceHealth() }, [checkServiceHealth])

  useEffect(() => {
    async function loadSubjectMasteries() {
      try {
        const child = useChildStore.getState().currentChild
        if (!child) return
        const masteryData: SubjectMastery[] = []
        for (const config of SUBJECT_CONFIG) {
          const nodes = await apiClient.get<KnowledgeNode>('/knowledge_nodes', {
            filters: [{ column: 'subject', operator: 'eq', value: config.subject }],
          })
          const nodeIds = nodes.map((n) => n.id).filter(Boolean) as string[]
          if (nodeIds.length === 0) { masteryData.push({ ...config, mastery: 0 }); continue }
          const records = await apiClient.get<MasteryRecord>('/mastery_records', {
            filters: [{ column: 'childId', operator: 'eq', value: Number(child.id) }],
          })
          const subjectRecords = records.filter((r) => nodeIds.includes(r.knowledgeNodeId))
          if (subjectRecords.length === 0) { masteryData.push({ ...config, mastery: 0 }); continue }
          const avgMastery = Math.round(subjectRecords.reduce((sum, r) => sum + r.masteryLevel, 0) / subjectRecords.length)
          masteryData.push({ ...config, mastery: avgMastery })
        }
        setSubjectMasteries(masteryData)
      } catch { /* ignore */ }
    }
    loadSubjectMasteries()
  }, [])

  const handlePinVerify = useCallback((isCorrect: boolean) => {
    if (isCorrect) { setIsAdvancedUnlocked(true); setShowPinVerify(false) }
  }, [])

  const handleSetPin = useCallback(async (pin: string) => {
    try {
      if (user?.id) {
        await apiClient.patch('/users', { parentPin: pin }, {
          filters: [{ column: 'id', operator: 'eq', value: user.id }],
        })
      }
      setSavedPin(pin)
      useAuthStore.setState((state) => ({
        user: state.user ? { ...state.user, parentPin: pin } : null,
      }))
    } catch {
      try { localStorage.setItem('littlestar_parent_pin_fallback', pin) } catch { /* ignore */ }
      setSavedPin(pin)
    }
  }, [user?.id])

  const handlePinCancel = useCallback(() => setShowPinVerify(false), [])

  const handleSaveConfig = useCallback(() => {
    try {
      // 保存每个功能类型选中的 provider
      for (const [serviceType, providerId] of Object.entries(selectedProviders)) {
        setSelectedProviderId(serviceType as ServiceType, providerId)
      }
      // 保存所有 provider 的字段值
      for (const [providerId, fields] of Object.entries(providerConfigs)) {
        setProviderConfig(providerId, fields)
      }
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 2000)
    } catch { /* ignore */ }
  }, [selectedProviders, providerConfigs])

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group); else next.add(group)
      return next
    })
  }, [])

  const handleProviderChange = useCallback((serviceType: ServiceType, providerId: string) => {
    setSelectedProviders((prev) => ({ ...prev, [serviceType]: providerId }))
  }, [])

  const handleProviderFieldChange = useCallback((providerId: string, fieldName: string, value: string) => {
    setProviderConfigs((prev) => ({
      ...prev,
      [providerId]: { ...prev[providerId], [fieldName]: value },
    }))
  }, [])

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '14px',
    border: '2px solid #FFE8D6', fontSize: '14px', fontFamily: T.fontBody,
    boxSizing: 'border-box', outline: 'none', backgroundColor: '#FFFCF8',
    color: T.textDark, transition: 'border-color 0.2s',
  }

  const STAT_CARDS = [
    { key: 'duration', value: `${stats.durationMinutes}分`, label: '今日学习', emoji: '⏰', bg: 'linear-gradient(135deg, #FFE0C2, #FFECD2)', color: T.sunOrange },
    { key: 'completed', value: `${stats.questionsCompleted}题`, label: '完成题数', emoji: '📝', bg: 'linear-gradient(135deg, #C8F7F1, #DEFFF9)', color: T.grassGreen },
    { key: 'accuracy', value: `${stats.accuracy}%`, label: '正确率', emoji: '🎯', bg: 'linear-gradient(135deg, #C8E9FA, #E0F2FE)', color: T.skyBlue },
  ]

  return (
    <div
      data-testid="parent-dashboard"
      style={{
        padding: '24px', maxWidth: '600px', margin: '0 auto',
        minHeight: '100vh', fontFamily: T.fontBody,
      }}
    >
      {/* 头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '26px', color: T.textDark, margin: 0,
          fontFamily: T.fontDisplay, fontWeight: 'bold',
        }}>
          📊 学习概览
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: T.textLight }}>👤 {user?.nickname ?? '用户'}</span>
          <motion.button
            data-testid="header-logout-btn"
            whileTap={{ scale: 0.95 }}
            onClick={() => { if (window.confirm('确定要退出登录吗？')) logout() }}
            style={{
              padding: '6px 14px', borderRadius: '16px',
              border: `1.5px solid ${T.errorRed}33`,
              backgroundColor: '#FFF0F0', color: T.errorRed,
              fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
              fontFamily: T.fontBody, whiteSpace: 'nowrap',
            }}
          >
            退出
          </motion.button>
        </div>
      </div>

      {/* API 错误提示 */}
      {apiError && (
        <div style={{
          padding: '12px 16px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #FFF3E7, #FFECD2)',
          marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span style={{ fontSize: '13px', color: T.warningAmber, flex: 1, fontWeight: 600 }}>
            后端数据服务连接失败，以下数据可能不准确
          </span>
        </div>
      )}

      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {STAT_CARDS.map((card, i) => (
          <motion.div
            key={card.key}
            data-testid={`stat-${card.key}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            style={{
              padding: '18px 12px', borderRadius: '22px',
              background: card.bg, textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{card.emoji}</div>
            <p style={{
              fontSize: '26px', fontWeight: 'bold', color: card.color, margin: 0,
              fontFamily: T.fontDisplay,
            }}>
              {card.value}
            </p>
            <p style={{ fontSize: '12px', color: T.textMedium, margin: '2px 0 0' }}>{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* 服务状态 */}
      <motion.div
        data-testid="service-status"
        whileTap={serviceOnline === false ? { scale: 0.98 } : undefined}
        onClick={serviceOnline === false ? checkServiceHealth : undefined}
        style={{
          padding: '14px 16px', borderRadius: '18px',
          background: serviceOnline === false ? '#FFF0F0' : 'linear-gradient(135deg, #F3E7FF, #E8D6FF)',
          marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px',
          cursor: serviceOnline === false ? 'pointer' : 'default',
        }}
      >
        <span style={{ fontSize: '18px' }}>{serviceOnline === null ? '⏳' : serviceOnline ? '🤖' : '⚠️'}</span>
        <span style={{
          fontSize: '14px', flex: 1, fontWeight: 600,
          color: serviceOnline === false ? T.errorRed : '#6B3FA0',
        }}>
          {serviceOnline === null ? 'OpenMAIC 服务检测中...' : serviceOnline ? 'OpenMAIC 服务已就绪' : 'OpenMAIC 服务离线'}
        </span>
        {serviceOnline === false && <span style={{ fontSize: '12px', color: T.textLight }}>点击重试</span>}
      </motion.div>

      {/* 缓存课程 */}
      <div
        data-testid="cache-info"
        style={{
          padding: '14px 16px', borderRadius: '18px',
          background: 'linear-gradient(135deg, #C8E9FA, #E0F2FE)',
          marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px',
        }}
      >
        <span style={{ fontSize: '18px' }}>📚</span>
        <span style={{ fontSize: '14px', color: T.skyBlue, fontWeight: 600 }}>
          已缓存 {cachedCount} 节课程
        </span>
      </div>

      {/* 学科掌握率 */}
      {subjectMasteries.length > 0 && (
        <div
          data-testid="subject-masteries"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}
        >
          {subjectMasteries.map((sm) => (
            <motion.div
              key={sm.subject}
              data-testid={`mastery-${sm.subject}`}
              whileHover={{ scale: 1.03 }}
              style={{
                padding: '16px', borderRadius: '18px',
                backgroundColor: T.cardBg, textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              }}
            >
              <p style={{ fontSize: '22px', margin: '0 0 4px' }}>{sm.emoji}</p>
              <p style={{
                fontSize: '22px', fontWeight: 'bold', color: sm.color, margin: '0 0 2px',
                fontFamily: T.fontDisplay,
              }}>
                {sm.mastery}%
              </p>
              <p style={{ fontSize: '12px', color: T.textMedium, margin: 0 }}>{sm.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* 学习报告入口 */}
      <motion.button
        data-testid="reports-btn"
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/reports')}
        style={{
          width: '100%', padding: '16px', borderRadius: '18px',
          border: '2px solid #FFE8D6', backgroundColor: T.cardBg,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', fontSize: '16px', color: T.textDark,
          fontFamily: T.fontBody, fontWeight: 600, marginBottom: '12px',
        }}
      >
        <span>📊 学习报告</span>
        <span style={{ color: T.sunOrange }}>→</span>
      </motion.button>

      {/* 高级设置入口 */}
      <motion.button
        data-testid="advanced-settings-btn"
        whileTap={{ scale: 0.97 }}
        onClick={() => { if (!isAdvancedUnlocked) setShowPinVerify(true) }}
        style={{
          width: '100%', padding: '16px', borderRadius: '18px',
          border: '2px solid #FFE8D6', backgroundColor: T.cardBg,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', fontSize: '16px', color: T.textDark,
          fontFamily: T.fontBody, fontWeight: 600, marginBottom: '24px',
        }}
      >
        <span>⚙️ 高级设置</span>
        <span style={{ color: isAdvancedUnlocked ? T.grassGreen : T.textLight }}>
          {isAdvancedUnlocked ? '✓' : '🔒'}
        </span>
      </motion.button>

      {/* PIN 验证 */}
      {showPinVerify && (
        <PinVerification
          correctPin={savedPin ?? ''} mode={savedPin ? 'verify' : 'setup'}
          onVerify={handlePinVerify} onCancel={handlePinCancel}
          onSetPin={handleSetPin} maxAttempts={5}
        />
      )}

      {/* 高级配置区域 */}
      {isAdvancedUnlocked && (
        <motion.div
          data-testid="advanced-config"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '24px', borderRadius: '22px',
            border: '2px solid #FFE8D6', backgroundColor: '#FFFCF8',
          }}
        >
          <h2 style={{
            fontSize: '18px', color: T.textDark, marginBottom: '20px',
            fontFamily: T.fontDisplay,
          }}>
            ⚙️ 高级配置
          </h2>

          <h3 style={{
            fontSize: '15px', color: T.textDark, marginBottom: '16px',
            fontFamily: T.fontDisplay, fontWeight: 600,
          }}>
            🔑 服务 API Key 配置
          </h3>
          <p style={{
            fontSize: '12px', color: T.textLight, marginBottom: '16px', lineHeight: 1.5,
          }}>
            每个功能可自由切换提供商（如 AI 对话可选通义千问、OpenAI、DeepSeek 等），
            展开后先选择提供商，再填写对应配置。留空则使用 .env 中的默认值。
          </p>

          {/* 按功能类型渲染提供商选择器 + 配置字段 */}
          {SERVICE_TYPES.map((svc) => {
            const providers = getProvidersForService(svc.type)
            const currentProviderId = selectedProviders[svc.type]
            const currentProvider = providers.find(p => p.id === currentProviderId)
            const isExpanded = expandedGroups.has(svc.type)
            const hasValue = currentProvider?.fields.some(
              (f) => providerConfigs[currentProviderId]?.[f.name]?.trim()
            ) ?? false
            return (
              <div key={svc.type} style={{ marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => toggleGroup(svc.type)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '14px',
                    border: '2px solid #FFE8D6', backgroundColor: isExpanded ? '#FFF5ED' : '#FFFCF8',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', fontSize: '14px', color: T.textDark,
                    fontFamily: T.fontBody, fontWeight: 600, transition: 'all 0.2s',
                  }}
                >
                  <span>
                    {svc.emoji} {svc.label}
                    <span style={{
                      marginLeft: '8px', fontSize: '11px', color: T.textLight,
                      fontWeight: 400,
                    }}>
                      {currentProvider?.label ?? '未选择'}
                    </span>
                    {hasValue && (
                      <span style={{
                        marginLeft: '8px', fontSize: '11px', color: T.grassGreen,
                        background: '#E8F8E8', padding: '2px 8px', borderRadius: '8px',
                      }}>
                        已配置
                      </span>
                    )}
                  </span>
                  <span style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s', fontSize: '12px',
                  }}>
                    ▼
                  </span>
                </button>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{
                      padding: '12px 14px 4px', marginTop: '4px',
                      borderRadius: '12px', backgroundColor: '#FFFAF5',
                      border: '1px solid #FFE8D6',
                    }}
                  >
                    {/* 提供商选择下拉框 */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{
                        fontSize: '12px', color: T.textLight, display: 'block',
                        marginBottom: '6px', fontWeight: 500,
                      }}>
                        选择提供商
                      </label>
                      <select
                        data-testid={`provider-select-${svc.type}`}
                        value={currentProviderId}
                        onChange={(e) => handleProviderChange(svc.type, e.target.value)}
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: '12px',
                          border: '2px solid #FFE8D6', backgroundColor: '#FFFFFF',
                          fontSize: '14px', color: T.textDark, fontFamily: T.fontBody,
                          fontWeight: 600, outline: 'none', cursor: 'pointer',
                          appearance: 'auto',
                        }}
                      >
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 当前提供商的配置字段 */}
                    {svc.description && (
                      <p style={{
                        fontSize: '12px', color: T.textLight, marginBottom: '12px',
                        lineHeight: 1.4, fontStyle: 'italic',
                      }}>
                        💡 {svc.description}
                      </p>
                    )}
                    {currentProvider?.fields.length === 0 && (
                      <p style={{
                        fontSize: '12px', color: T.grassGreen, marginBottom: '12px',
                        lineHeight: 1.4, fontStyle: 'italic',
                      }}>
                        ✅ 此提供商无需额外配置，开箱即用
                      </p>
                    )}
                    {currentProvider?.fields.map((field) => (
                      <div key={field.name} style={{ marginBottom: '12px' }}>
                        <label htmlFor={`config-${currentProviderId}-${field.name}`} style={{
                          fontSize: '13px', color: T.textMedium, display: 'block',
                          marginBottom: '4px', fontWeight: 500,
                        }}>
                          {field.label}
                          {field.description && (
                            <span style={{ fontSize: '11px', color: T.textLight, marginLeft: '4px' }}>
                              ({field.description})
                            </span>
                          )}
                        </label>
                        <input
                          id={`config-${currentProviderId}-${field.name}`}
                          data-testid={`config-${currentProviderId}-${field.name}`}
                          type={field.type}
                          value={providerConfigs[currentProviderId]?.[field.name] ?? ''}
                          onChange={(e) => handleProviderFieldChange(currentProviderId, field.name, e.target.value)}
                          placeholder={field.placeholder}
                          style={{ ...inputStyle, fontSize: '13px', padding: '10px 12px' }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = T.sunOrange }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = '#FFE8D6' }}
                        />
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            )
          })}

          <motion.button
            data-testid="config-save-btn"
            whileTap={{ scale: 0.95 }}
            onClick={handleSaveConfig}
            style={{
              width: '100%', padding: '14px', borderRadius: '16px', border: 'none',
              background: configSaved
                ? `linear-gradient(135deg, ${T.grassGreen}, #4DD8C9)`
                : `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
              color: T.textWhite, fontSize: '15px', fontWeight: 'bold',
              fontFamily: T.fontDisplay, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255, 140, 66, 0.25)',
              marginTop: '16px',
            }}
          >
            {configSaved ? '✓ 已保存' : '💾 保存所有配置'}
          </motion.button>

          {/* ═══ 高级课堂设置已移至「课堂」页面 ═══ */}
          <div style={{
            marginTop: '24px', borderTop: '2px dashed #FFE8D6', paddingTop: '20px',
          }}>
            <div style={{
              padding: '16px', borderRadius: '16px',
              border: '1.5px solid #E8D6FF', backgroundColor: '#FAF5FF',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '28px' }}>🎓</span>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#6B3FA0', margin: '8px 0 4px' }}>
                高级课堂设置已移至「课堂」页面
              </p>
              <p style={{ fontSize: '12px', color: T.textLight, margin: '0 0 12px' }}>
                LLM 模型、TTS 语音、图片/视频生成、角色配置等请在底部「课堂」Tab 中设置
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/classroom-settings')}
                style={{
                  padding: '10px 24px', borderRadius: '14px', border: 'none',
                  background: 'linear-gradient(135deg, #9B7FD0, #6B3FA0)',
                  color: '#FFFFFF', fontSize: '14px', fontWeight: 'bold',
                  fontFamily: T.fontDisplay, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(107, 63, 160, 0.25)',
                }}
              >
                前往课堂设置 →
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 退出登录 */}
      <motion.button
        data-testid="logout-btn"
        whileTap={{ scale: 0.95 }}
        onClick={() => { if (window.confirm('确定要退出登录吗？')) logout() }}
        style={{
          width: '100%', padding: '16px', borderRadius: '18px',
          border: `2px solid ${T.errorRed}33`,
          backgroundColor: T.cardBg, color: T.errorRed,
          fontSize: '16px', fontWeight: 'bold',
          fontFamily: T.fontDisplay, cursor: 'pointer',
          marginTop: '24px', marginBottom: '32px',
        }}
      >
        👋 退出登录
      </motion.button>
    </div>
  )
}
