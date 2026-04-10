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

import type { Subject, DailySession, KnowledgeNode, MasteryRecord, ClassroomAgentMode } from '@/types/models'
import { DEFAULT_ADVANCED_SETTINGS } from '@/types/models'

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
  const [classroomSettingsOpen, setClassroomSettingsOpen] = useState(false)
  const [classroomConfigSaved, setClassroomConfigSaved] = useState(false)

  // 从当前孩子 settings 初始化高级课堂设置
  const currentChild = useChildStore((s) => s.currentChild)
  const updateChildSettings = useChildStore((s) => s.updateChildSettings)
  const childSettings = currentChild?.settings
  const [advancedSettings, setAdvancedSettings] = useState(() => {
    if (!childSettings) return { ...DEFAULT_ADVANCED_SETTINGS }
    return {
      enableTTS: childSettings.enableTTS ?? DEFAULT_ADVANCED_SETTINGS.enableTTS,
      ttsProviderId: childSettings.ttsProviderId ?? DEFAULT_ADVANCED_SETTINGS.ttsProviderId,
      ttsVoice: childSettings.ttsVoice ?? DEFAULT_ADVANCED_SETTINGS.ttsVoice,
      ttsSpeed: childSettings.ttsSpeed ?? DEFAULT_ADVANCED_SETTINGS.ttsSpeed,
      enableImageGeneration: childSettings.enableImageGeneration ?? DEFAULT_ADVANCED_SETTINGS.enableImageGeneration,
      enableVideoGeneration: childSettings.enableVideoGeneration ?? DEFAULT_ADVANCED_SETTINGS.enableVideoGeneration,
      classroomAgentMode: childSettings.classroomAgentMode ?? DEFAULT_ADVANCED_SETTINGS.classroomAgentMode,
      selfIntroduction: childSettings.selfIntroduction ?? DEFAULT_ADVANCED_SETTINGS.selfIntroduction,
      llmModel: childSettings.llmModel ?? DEFAULT_ADVANCED_SETTINGS.llmModel,
      llmApiKey: childSettings.llmApiKey ?? DEFAULT_ADVANCED_SETTINGS.llmApiKey,
      llmBaseUrl: childSettings.llmBaseUrl ?? DEFAULT_ADVANCED_SETTINGS.llmBaseUrl,
    }
  })

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
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 2000)
    } catch { /* ignore */ }
  }, [openmaicUrl, apiKey])

  const handleSaveClassroomSettings = useCallback(() => {
    if (!currentChild?.id) return
    updateChildSettings(currentChild.id, advancedSettings)
    setClassroomConfigSaved(true)
    setTimeout(() => setClassroomConfigSaved(false), 2000)
  }, [currentChild?.id, updateChildSettings, advancedSettings])

  const updateAdvanced = useCallback(<K extends keyof typeof advancedSettings>(
    key: K, value: (typeof advancedSettings)[K],
  ) => {
    setAdvancedSettings((prev) => ({ ...prev, [key]: value }))
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

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="api-key" style={{
              fontSize: '14px', color: T.textMedium, display: 'block', marginBottom: '6px', fontWeight: 600,
            }}>
              API Key
            </label>
            <input
              id="api-key" data-testid="config-api-key"
              type="password" value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入 API Key" style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = T.sunOrange }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#FFE8D6' }}
            />
          </div>

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
            }}
          >
            {configSaved ? '✓ 已保存' : '💾 保存配置'}
          </motion.button>

          {/* ═══ 高级课堂设置（折叠面板） ═══ */}
          <div style={{ marginTop: '24px', borderTop: '2px dashed #FFE8D6', paddingTop: '20px' }}>
            <motion.button
              data-testid="classroom-settings-toggle"
              whileTap={{ scale: 0.97 }}
              onClick={() => setClassroomSettingsOpen(!classroomSettingsOpen)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '16px',
                border: '2px solid #E8D6FF', backgroundColor: '#FAF5FF',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', fontSize: '15px', color: '#6B3FA0',
                fontFamily: T.fontDisplay, fontWeight: 'bold',
              }}
            >
              <span>🎓 高级课堂设置</span>
              <span style={{
                transform: classroomSettingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s',
                fontSize: '12px',
              }}>
                ▼
              </span>
            </motion.button>

            {classroomSettingsOpen && (
              <motion.div
                data-testid="classroom-settings-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                {/* LLM 模型配置 */}
                <div style={{
                  padding: '16px', borderRadius: '16px',
                  border: '1.5px solid #E8D6FF', backgroundColor: '#FDFBFF',
                }}>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#6B3FA0', margin: '0 0 12px' }}>
                    🤖 LLM 模型配置
                  </p>

                  <label htmlFor="llm-model" style={{
                    fontSize: '13px', color: T.textMedium, display: 'block', marginBottom: '4px', fontWeight: 600,
                  }}>
                    模型标识
                  </label>
                  <input
                    id="llm-model" data-testid="config-llm-model"
                    type="text" value={advancedSettings.llmModel}
                    onChange={(e) => updateAdvanced('llmModel', e.target.value)}
                    placeholder="如 openai:gpt-4o 或 doubao:doubao-pro-32k"
                    style={{ ...inputStyle, marginBottom: '12px' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#9B7FD0' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#FFE8D6' }}
                  />

                  <label htmlFor="llm-api-key" style={{
                    fontSize: '13px', color: T.textMedium, display: 'block', marginBottom: '4px', fontWeight: 600,
                  }}>
                    API Key
                  </label>
                  <input
                    id="llm-api-key" data-testid="config-llm-api-key"
                    type="password" value={advancedSettings.llmApiKey}
                    onChange={(e) => updateAdvanced('llmApiKey', e.target.value)}
                    placeholder="输入模型的 API Key"
                    style={{ ...inputStyle, marginBottom: '12px' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#9B7FD0' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#FFE8D6' }}
                  />

                  <label htmlFor="llm-base-url" style={{
                    fontSize: '13px', color: T.textMedium, display: 'block', marginBottom: '4px', fontWeight: 600,
                  }}>
                    Base URL（可选）
                  </label>
                  <input
                    id="llm-base-url" data-testid="config-llm-base-url"
                    type="text" value={advancedSettings.llmBaseUrl}
                    onChange={(e) => updateAdvanced('llmBaseUrl', e.target.value)}
                    placeholder="自定义 API 地址（留空使用默认）"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#9B7FD0' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#FFE8D6' }}
                  />
                </div>

                {/* TTS 语音设置 */}
                <div style={{
                  padding: '16px', borderRadius: '16px',
                  border: '1.5px solid #C8E9FA', backgroundColor: '#FBFEFF',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: T.skyBlue, margin: 0 }}>
                      🔊 TTS 语音合成
                    </p>
                    <label
                      data-testid="config-tts-toggle"
                      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '6px' }}
                    >
                      <input
                        type="checkbox"
                        checked={advancedSettings.enableTTS}
                        onChange={(e) => updateAdvanced('enableTTS', e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: T.skyBlue }}
                      />
                      <span style={{ fontSize: '13px', color: T.textMedium }}>
                        {advancedSettings.enableTTS ? '已开启' : '已关闭'}
                      </span>
                    </label>
                  </div>

                  {advancedSettings.enableTTS && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label htmlFor="tts-provider" style={{
                          fontSize: '13px', color: T.textMedium, display: 'block', marginBottom: '4px', fontWeight: 600,
                        }}>
                          TTS 服务商
                        </label>
                        <select
                          id="tts-provider" data-testid="config-tts-provider"
                          value={advancedSettings.ttsProviderId}
                          onChange={(e) => updateAdvanced('ttsProviderId', e.target.value)}
                          style={{ ...inputStyle, appearance: 'auto' }}
                        >
                          <option value="">默认</option>
                          <option value="volcengine">火山引擎</option>
                          <option value="azure">Azure TTS</option>
                          <option value="openai">OpenAI TTS</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="tts-voice" style={{
                          fontSize: '13px', color: T.textMedium, display: 'block', marginBottom: '4px', fontWeight: 600,
                        }}>
                          语音角色
                        </label>
                        <input
                          id="tts-voice" data-testid="config-tts-voice"
                          type="text" value={advancedSettings.ttsVoice}
                          onChange={(e) => updateAdvanced('ttsVoice', e.target.value)}
                          placeholder="语音 ID（如 zh_female_01）"
                          style={inputStyle}
                          onFocus={(e) => { e.currentTarget.style.borderColor = T.skyBlue }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = '#FFE8D6' }}
                        />
                      </div>

                      <div>
                        <label htmlFor="tts-speed" style={{
                          fontSize: '13px', color: T.textMedium, display: 'block', marginBottom: '4px', fontWeight: 600,
                        }}>
                          语速：{advancedSettings.ttsSpeed.toFixed(1)}x
                        </label>
                        <input
                          id="tts-speed" data-testid="config-tts-speed"
                          type="range" min="0.5" max="2.0" step="0.1"
                          value={advancedSettings.ttsSpeed}
                          onChange={(e) => updateAdvanced('ttsSpeed', parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: T.skyBlue }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 生成功能开关 */}
                <div style={{
                  padding: '16px', borderRadius: '16px',
                  border: '1.5px solid #C8F7F1', backgroundColor: '#FBFFFD',
                }}>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: T.grassGreen, margin: '0 0 12px' }}>
                    ✨ 内容生成选项
                  </p>

                  <label
                    data-testid="config-image-gen-toggle"
                    style={{
                      display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px',
                      marginBottom: '10px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={advancedSettings.enableImageGeneration}
                      onChange={(e) => updateAdvanced('enableImageGeneration', e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: T.grassGreen }}
                    />
                    <span style={{ fontSize: '14px', color: T.textDark }}>
                      🖼️ 启用图片生成
                    </span>
                  </label>

                  <label
                    data-testid="config-video-gen-toggle"
                    style={{
                      display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={advancedSettings.enableVideoGeneration}
                      onChange={(e) => updateAdvanced('enableVideoGeneration', e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: T.grassGreen }}
                    />
                    <span style={{ fontSize: '14px', color: T.textDark }}>
                      🎬 启用视频生成
                    </span>
                  </label>
                </div>

                {/* Agent 模式 */}
                <div style={{
                  padding: '16px', borderRadius: '16px',
                  border: '1.5px solid #FFE0C2', backgroundColor: '#FFFCF8',
                }}>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: T.sunOrange, margin: '0 0 12px' }}>
                    🎭 课堂角色模式
                  </p>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    {([
                      { value: 'preset' as ClassroomAgentMode, label: '预设角色', emoji: '📋', desc: '使用预设的老师角色' },
                      { value: 'auto' as ClassroomAgentMode, label: '自动生成', emoji: '🎲', desc: '根据课程自动创建角色' },
                    ] as const).map((mode) => (
                      <motion.button
                        key={mode.value}
                        data-testid={`config-agent-mode-${mode.value}`}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => updateAdvanced('classroomAgentMode', mode.value)}
                        style={{
                          flex: 1, padding: '14px', borderRadius: '14px',
                          border: `2px solid ${advancedSettings.classroomAgentMode === mode.value ? T.sunOrange : '#FFE8D6'}`,
                          backgroundColor: advancedSettings.classroomAgentMode === mode.value ? '#FFF3E7' : '#FFFFFF',
                          cursor: 'pointer', textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>{mode.emoji}</div>
                        <div style={{
                          fontSize: '13px', fontWeight: 'bold',
                          color: advancedSettings.classroomAgentMode === mode.value ? T.sunOrange : T.textMedium,
                        }}>
                          {mode.label}
                        </div>
                        <div style={{ fontSize: '11px', color: T.textLight, marginTop: '2px' }}>
                          {mode.desc}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* 学生自我介绍 */}
                <div style={{
                  padding: '16px', borderRadius: '16px',
                  border: '1.5px solid #FFDEE9', backgroundColor: '#FFFBFC',
                }}>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: T.candyPink, margin: '0 0 8px' }}>
                    👋 学生自我介绍
                  </p>
                  <p style={{ fontSize: '12px', color: T.textLight, margin: '0 0 10px' }}>
                    告诉 AI 老师关于孩子的情况，课堂内容会更贴合
                  </p>
                  <textarea
                    data-testid="config-self-introduction"
                    value={advancedSettings.selfIntroduction}
                    onChange={(e) => updateAdvanced('selfIntroduction', e.target.value)}
                    placeholder="如：我叫小明，今年5岁，最喜欢小动物和画画..."
                    rows={3}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      minHeight: '80px',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = T.candyPink }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#FFE8D6' }}
                  />
                </div>

                {/* 保存课堂设置按钮 */}
                <motion.button
                  data-testid="classroom-settings-save-btn"
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSaveClassroomSettings}
                  disabled={!currentChild?.id}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '16px', border: 'none',
                    background: classroomConfigSaved
                      ? `linear-gradient(135deg, ${T.grassGreen}, #4DD8C9)`
                      : !currentChild?.id
                        ? '#E0E0E0'
                        : 'linear-gradient(135deg, #9B7FD0, #6B3FA0)',
                    color: T.textWhite, fontSize: '15px', fontWeight: 'bold',
                    fontFamily: T.fontDisplay, cursor: currentChild?.id ? 'pointer' : 'not-allowed',
                    boxShadow: currentChild?.id ? '0 4px 16px rgba(107, 63, 160, 0.25)' : 'none',
                    opacity: currentChild?.id ? 1 : 0.6,
                  }}
                >
                  {classroomConfigSaved ? '✓ 课堂设置已保存' : '💾 保存课堂设置'}
                </motion.button>

                {!currentChild?.id && (
                  <p style={{ fontSize: '12px', color: T.warningAmber, textAlign: 'center', margin: '4px 0 0' }}>
                    ⚠️ 请先选择一个孩子才能保存课堂设置
                  </p>
                )}
              </motion.div>
            )}
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
