/**
 * 家长仪表盘 — Sunny Playground 风格
 * 学习时长、完成量、正确率概览
 * 分层配置：基础展示层（无需密码）+ 高级配置层（PIN 解锁）
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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

const OPENMAIC_URL_KEY = 'littlestar_openmaic_url'
const OPENMAIC_API_KEY_KEY = 'littlestar_openmaic_api_key'

// ===== 所有 API Key 的 localStorage 键名 =====
const CONFIG_KEYS = {
  // 前端 AI 对话
  qwenApiKey: 'littlestar_qwen_api_key',
  qwenBaseUrl: 'littlestar_qwen_base_url',
  qwenModel: 'littlestar_qwen_model',
  // 前端 TTS 语音合成
  cosyvoiceApiKey: 'littlestar_cosyvoice_api_key',
  cosyvoiceBaseUrl: 'littlestar_cosyvoice_base_url',
  // 前端 STT 语音识别
  paraformerApiKey: 'littlestar_paraformer_api_key',
  paraformerBaseUrl: 'littlestar_paraformer_base_url',
  // 讯飞口语评测
  iflytekAppId: 'littlestar_iflytek_app_id',
  iflytekApiKey: 'littlestar_iflytek_api_key',
  iflytekApiSecret: 'littlestar_iflytek_api_secret',
  // 后端 LLM
  backendLlmApiKey: 'littlestar_backend_llm_api_key',
  backendLlmBaseUrl: 'littlestar_backend_llm_base_url',
  backendLlmModel: 'littlestar_backend_llm_model',
  // 后端 TTS（MiniMax）
  backendTtsApiKey: 'littlestar_backend_tts_api_key',
  // 后端图片生成
  backendImageApiKey: 'littlestar_backend_image_api_key',
  backendImageBaseUrl: 'littlestar_backend_image_base_url',
} as const

/** 配置项定义 */
interface ConfigField {
  key: keyof typeof CONFIG_KEYS
  label: string
  placeholder: string
  type: 'text' | 'password'
  group: string
  description?: string
}

/** 所有配置项分组定义 */
const CONFIG_FIELDS: ConfigField[] = [
  // OpenMAIC 服务
  { key: 'qwenApiKey', label: '通义千问 API Key', placeholder: '输入阿里云 DashScope API Key', type: 'password', group: '🤖 AI 对话（通义千问）', description: '用于 AI 老师对话补全' },
  { key: 'qwenBaseUrl', label: '通义千问 Base URL', placeholder: 'https://dashscope.aliyuncs.com/compatible-mode/v1', type: 'text', group: '🤖 AI 对话（通义千问）' },
  { key: 'qwenModel', label: '通义千问模型', placeholder: 'qwen-turbo', type: 'text', group: '🤖 AI 对话（通义千问）' },
  // TTS
  { key: 'cosyvoiceApiKey', label: 'CosyVoice API Key', placeholder: '输入阿里云 DashScope API Key', type: 'password', group: '🔊 语音合成（CosyVoice TTS）', description: '用于 AI 老师语音播报' },
  { key: 'cosyvoiceBaseUrl', label: 'CosyVoice Base URL', placeholder: 'https://dashscope.aliyuncs.com/api/v1', type: 'text', group: '🔊 语音合成（CosyVoice TTS）' },
  // STT
  { key: 'paraformerApiKey', label: 'Paraformer API Key', placeholder: '输入阿里云 DashScope API Key', type: 'password', group: '🎤 语音识别（Paraformer STT）', description: '用于识别幼儿语音回答' },
  { key: 'paraformerBaseUrl', label: 'Paraformer Base URL', placeholder: 'https://dashscope.aliyuncs.com/api/v1', type: 'text', group: '🎤 语音识别（Paraformer STT）' },
  // 讯飞
  { key: 'iflytekAppId', label: '讯飞 App ID', placeholder: '输入讯飞开放平台 App ID', type: 'text', group: '📝 发音评测（讯飞 ISE）', description: '用于评估幼儿英语发音' },
  { key: 'iflytekApiKey', label: '讯飞 API Key', placeholder: '输入讯飞 API Key', type: 'password', group: '📝 发音评测（讯飞 ISE）' },
  { key: 'iflytekApiSecret', label: '讯飞 API Secret', placeholder: '输入讯飞 API Secret', type: 'password', group: '📝 发音评测（讯飞 ISE）' },
  // 后端 LLM
  { key: 'backendLlmApiKey', label: 'LLM API Key', placeholder: '输入后端 LLM API Key', type: 'password', group: '🏫 后端课堂生成（OpenMAIC）', description: '后端 OpenMAIC 使用的 LLM Key' },
  { key: 'backendLlmBaseUrl', label: 'LLM Base URL', placeholder: 'https://dashscope.aliyuncs.com/compatible-mode/v1', type: 'text', group: '🏫 后端课堂生成（OpenMAIC）' },
  { key: 'backendLlmModel', label: 'LLM 默认模型', placeholder: 'openai:qwen-plus', type: 'text', group: '🏫 后端课堂生成（OpenMAIC）' },
  // 后端 TTS
  { key: 'backendTtsApiKey', label: 'MiniMax TTS API Key', placeholder: '输入 MiniMax API Key', type: 'password', group: '🎵 后端语音（MiniMax TTS）', description: '后端课堂音频生成' },
  // 后端图片
  { key: 'backendImageApiKey', label: '图片生成 API Key', placeholder: '输入图片生成 API Key', type: 'password', group: '🖼️ 后端图片生成', description: '后端课堂配图生成' },
  { key: 'backendImageBaseUrl', label: '图片生成 Base URL', placeholder: 'https://dashscope.aliyuncs.com/compatible-mode/v1', type: 'text', group: '🖼️ 后端图片生成' },
]

/** 从 localStorage 加载所有配置 */
function loadAllConfig(): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [field, storageKey] of Object.entries(CONFIG_KEYS)) {
    try { result[field] = localStorage.getItem(storageKey) ?? '' } catch { result[field] = '' }
  }
  return result
}

/** 保存所有配置到 localStorage */
function saveAllConfig(config: Record<string, string>): void {
  for (const [field, storageKey] of Object.entries(CONFIG_KEYS)) {
    try { localStorage.setItem(storageKey, config[field] ?? '') } catch { /* ignore */ }
  }
}

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
  const [openmaicUrl, setOpenmaicUrl] = useState(() => {
    try { return localStorage.getItem(OPENMAIC_URL_KEY) ?? 'http://localhost:3000' } catch { return 'http://localhost:3000' }
  })
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem(OPENMAIC_API_KEY_KEY) ?? '' } catch { return '' }
  })
  const [configSaved, setConfigSaved] = useState(false)
  // 所有 API Key 配置
  const [allConfig, setAllConfig] = useState<Record<string, string>>(() => loadAllConfig())
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
      localStorage.setItem(OPENMAIC_URL_KEY, openmaicUrl)
      localStorage.setItem(OPENMAIC_API_KEY_KEY, apiKey)
      saveAllConfig(allConfig)
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 2000)
    } catch { /* ignore */ }
  }, [openmaicUrl, apiKey, allConfig])

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group); else next.add(group)
      return next
    })
  }, [])

  const updateConfig = useCallback((key: string, value: string) => {
    setAllConfig((prev) => ({ ...prev, [key]: value }))
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

          {/* OpenMAIC 服务地址 */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="openmaic-url" style={{
              fontSize: '14px', color: T.textMedium, display: 'block', marginBottom: '6px', fontWeight: 600,
            }}>
              OpenMAIC 服务地址
            </label>
            <input
              id="openmaic-url" data-testid="config-openmaic-url"
              type="text" value={openmaicUrl}
              onChange={(e) => setOpenmaicUrl(e.target.value)}
              placeholder="http://localhost:3000" style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = T.sunOrange }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#FFE8D6' }}
            />
          </div>

          {/* OpenMAIC API Key */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="api-key" style={{
              fontSize: '14px', color: T.textMedium, display: 'block', marginBottom: '6px', fontWeight: 600,
            }}>
              OpenMAIC API Key
            </label>
            <input
              id="api-key" data-testid="config-api-key"
              type="password" value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入 OpenMAIC API Key" style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = T.sunOrange }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#FFE8D6' }}
            />
          </div>

          {/* 分割线 */}
          <div style={{
            height: '1px', background: 'linear-gradient(90deg, transparent, #FFE8D6, transparent)',
            margin: '20px 0',
          }} />

          <h3 style={{
            fontSize: '15px', color: T.textDark, marginBottom: '16px',
            fontFamily: T.fontDisplay, fontWeight: 600,
          }}>
            🔑 服务 API Key 配置
          </h3>
          <p style={{
            fontSize: '12px', color: T.textLight, marginBottom: '16px', lineHeight: 1.5,
          }}>
            以下是项目中用到的所有 API Key，点击分组展开配置。留空则使用 .env 中的默认值。
          </p>

          {/* 按分组渲染配置项 */}
          {(() => {
            const groups = [...new Set(CONFIG_FIELDS.map((f) => f.group))]
            return groups.map((group) => {
              const fields = CONFIG_FIELDS.filter((f) => f.group === group)
              const isExpanded = expandedGroups.has(group)
              const hasValue = fields.some((f) => allConfig[f.key]?.trim())
              return (
                <div key={group} style={{ marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '14px',
                      border: '2px solid #FFE8D6', backgroundColor: isExpanded ? '#FFF5ED' : '#FFFCF8',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', fontSize: '14px', color: T.textDark,
                      fontFamily: T.fontBody, fontWeight: 600, transition: 'all 0.2s',
                    }}
                  >
                    <span>
                      {group}
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
                      {fields[0]?.description && (
                        <p style={{
                          fontSize: '12px', color: T.textLight, marginBottom: '12px',
                          lineHeight: 1.4, fontStyle: 'italic',
                        }}>
                          💡 {fields[0].description}
                        </p>
                      )}
                      {fields.map((field) => (
                        <div key={field.key} style={{ marginBottom: '12px' }}>
                          <label htmlFor={`config-${field.key}`} style={{
                            fontSize: '13px', color: T.textMedium, display: 'block',
                            marginBottom: '4px', fontWeight: 500,
                          }}>
                            {field.label}
                          </label>
                          <input
                            id={`config-${field.key}`}
                            data-testid={`config-${field.key}`}
                            type={field.type}
                            value={allConfig[field.key] ?? ''}
                            onChange={(e) => updateConfig(field.key, e.target.value)}
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
            })
          })()}

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
