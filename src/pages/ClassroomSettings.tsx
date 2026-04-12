/**
 * 课堂设置页面 — Sunny Playground 风格
 *
 * 直接复用 OpenMAIC 原生组件和 Store，配置即时生效：
 * - UserProfileCard → 头像 / 昵称 / 自我介绍（写入数据库）
 * - AgentBar → 老师音色 / 预设&自动模式 / 角色音色 / 讨论轮数 / 同学选择（localStorage）
 *
 * 所有操作直接写入 OpenMAIC 的三个 Store：
 *   useSettingsStore（Agent 设置、TTS 配置）
 *   useAgentRegistry（角色注册表）
 *   useUserProfileStore（用户头像/昵称/简介）
 *
 * 高级 AI 设置（API Key、Provider 等）已迁移到：
 *   家长模块 → ParentSettings → SettingsDialog
 *   关闭 SettingsDialog 时通过 syncOpenMAICToChild() 反向同步到数据库
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { VoicePicker } from '@/components/classroom/VoicePicker'
import { useSettingsStore } from '@/lib/openmaic/store/settings'
import { useAgentRegistry } from '@/lib/openmaic/orchestration/registry/store'
import { useUserProfileStore, AVATAR_OPTIONS } from '@/stores/openmaic/user-profile'
import { useChildStore } from '@/stores/childStore'
import { syncSettingsToOpenMAIC } from '@/stores/openmaic/settings-sync'
import { resolveAgentVoice, getAvailableProvidersWithVoices, getCurrentProviderVoices } from '@/lib/openmaic/audio/voice-resolver'

import type { TTSProviderId } from '@/lib/openmaic/audio/types'
import type { ProviderWithVoices } from '@/lib/openmaic/audio/voice-resolver'

/* ═══════════════════════════════════════════
   设计 Token — Sunny Playground 风格
   ═══════════════════════════════════════════ */
const T = {
  fontDisplay: "'Baloo 2', 'Nunito', sans-serif",
  fontBody: "'Nunito', 'PingFang SC', sans-serif",
  sunOrange: '#FF8C42',
  sunYellow: '#FFD166',
  skyBlue: '#5BC0EB',
  grassGreen: '#2EC4B6',
  candyPink: '#FF6B9D',
  starGold: '#FFC845',
  cardBg: '#FFFFFF',
  cardRadius: '24px',
  cardShadow: '0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  errorRed: '#FF6B6B',
  violet: '#6B3FA0',
  violetLight: '#9B7FD0',
}

/** 最大上传头像体积 5 MB */
const MAX_AVATAR_SIZE = 5 * 1024 * 1024

function mapBackendTTSProviderId(providerId: string): TTSProviderId | null {
  switch (providerId) {
    case 'openai':
      return 'openai-tts'
    case 'minimax':
      return 'minimax-tts'
    case 'doubao':
    case 'volcengine':
      return 'doubao-tts'
    case 'azure':
      return 'azure-tts'
    case 'qwen':
      return 'qwen-tts'
    case 'glm':
      return 'glm-tts'
    case 'elevenlabs':
      return 'elevenlabs-tts'
    case 'browser-native':
    case 'browser-native-tts':
      return 'browser-native-tts'
    default:
      return null
  }
}

/* ═══════════════════════════════════════════
   主页面
   ═══════════════════════════════════════════ */

export function ClassroomSettings() {
  // === OpenMAIC Settings Store ===
  const selectedAgentIds = useSettingsStore((s) => s.selectedAgentIds)
  const setSelectedAgentIds = useSettingsStore((s) => s.setSelectedAgentIds)
  const maxTurns = useSettingsStore((s) => s.maxTurns)
  const setMaxTurns = useSettingsStore((s) => s.setMaxTurns)
  const agentMode = useSettingsStore((s) => s.agentMode)
  const setAgentMode = useSettingsStore((s) => s.setAgentMode)
  const ttsProvidersConfig = useSettingsStore((s) => s.ttsProvidersConfig)
  const ttsEnabled = useSettingsStore((s) => s.ttsEnabled)
  const ttsProviderId = useSettingsStore((s) => s.ttsProviderId)
  const ttsVoice = useSettingsStore((s) => s.ttsVoice)
  const setTTSProvider = useSettingsStore((s) => s.setTTSProvider)
  const setTTSVoice = useSettingsStore((s) => s.setTTSVoice)
  const setTTSProviderConfig = useSettingsStore((s) => s.setTTSProviderConfig)

  // === Agent Registry ===
  const { listAgents, updateAgent } = useAgentRegistry()

  // === User Profile ===
  const avatar = useUserProfileStore((s) => s.avatar)
  const nickname = useUserProfileStore((s) => s.nickname)
  const bio = useUserProfileStore((s) => s.bio)
  const setAvatar = useUserProfileStore((s) => s.setAvatar)
  const setNickname = useUserProfileStore((s) => s.setNickname)
  const setBio = useUserProfileStore((s) => s.setBio)

  // === 本地 UI 状态 ===
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // === 数据库持久化 Mutation（已迁移到 SettingsDialog 反向同步） ===

  // === 当前孩子数据（用于正向同步 DB → OpenMAIC Store）===
  const currentChild = useChildStore((s) => s.currentChild)
  const childSettings = currentChild?.settings

  // 当孩子的数据库设置变化时，正向同步到 OpenMAIC Store
  useEffect(() => {
    if (!childSettings) return
    syncSettingsToOpenMAIC(childSettings)
  }, [childSettings, currentChild?.id])

  // 构建可用的 TTS 音色列表
  // 优先使用当前已同步到 OpenMAIC store 的 provider；如果还停留在 browser-native，
  // 就回退到孩子已配置的 TTS provider，再不行回退到第一个可用服务商，避免列表为空。
  const serverProviders = getAvailableProvidersWithVoices(ttsProvidersConfig)
  const mappedAdvancedTTSProviderId = mapBackendTTSProviderId(childSettings?.ttsProviderId || '')
  const fallbackTTSProviderId =
    mappedAdvancedTTSProviderId || serverProviders[0]?.providerId || 'openai-tts'
  const currentProviderVoices = getCurrentProviderVoices(ttsProviderId, fallbackTTSProviderId)
  const availableProviders: ProviderWithVoices[] = currentProviderVoices ? [currentProviderVoices] : []

  // Agent 列表
  const allAgents = listAgents()
  const agents = allAgents.filter((a) => !a.isGenerated)
  const teacherAgent = agents.find((a) => a.role === 'teacher')
  const studentAgents = agents.filter((a) => a.role !== 'teacher')

  // === 事件处理 ===

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  const startEditName = () => {
    setNameDraft(nickname)
    setEditingName(true)
  }

  const commitName = async () => {
    const trimmed = nameDraft.trim()
    setNickname(trimmed)
    setEditingName(false)

    // 持久化到数据库 children.name
    const child = useChildStore.getState().currentChild
    if (child?.id && trimmed) {
      try {
        const { apiClient } = await import('@/services/api')
        await apiClient.patch('/children', { name: trimmed }, {
          filters: [{ column: 'id', operator: 'eq', value: Number(child.id) }],
        })
        console.log('[commitName] ✅ 昵称已写入数据库:', trimmed)
        useChildStore.getState().updateChild(String(child.id), { name: trimmed })
      } catch (err) {
        console.error('[commitName] ❌ 昵称写入数据库失败:', err)
      }
    }
  }

  /** 同步自我介绍到数据库（写入 children.settings.bio） */
  const bioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncBioToDb = useCallback((newBio: string) => {
    // 1. 立即更新 UI
    setBio(newBio)

    // 2. debounce 写入数据库（500ms 无输入后写入）
    if (bioTimerRef.current) clearTimeout(bioTimerRef.current)
    bioTimerRef.current = setTimeout(async () => {
      const child = useChildStore.getState().currentChild
      if (!child?.id) return
      try {
        const currentSettings = (child.settings || {}) as Record<string, unknown>
        const { apiClient } = await import('@/services/api')
        await apiClient.patch('/children', {
          settings: { ...currentSettings, bio: newBio },
        }, {
          filters: [{ column: 'id', operator: 'eq', value: Number(child.id) }],
        })
        console.log('[syncBioToDb] ✅ 自我介绍已写入数据库:', newBio.substring(0, 30))
      } catch (err) {
        console.error('[syncBioToDb] ❌ 自我介绍写入数据库失败:', err)
      }
    }, 500)
  }, [setBio])

  /** 同步头像到数据库（当前孩子的 children.avatar 字段） */
  const syncAvatarToDb = useCallback(async (newAvatar: string) => {
    // 1. 立即更新 UI（localStorage 持久化）
    setAvatar(newAvatar)

    // 2. 同时持久化到 PostgreSQL
    const child = useChildStore.getState().currentChild
    console.log('[syncAvatarToDb] currentChild:', child?.id, child?.name, 'avatar length:', newAvatar.length)

    if (!child?.id) {
      console.warn('[syncAvatarToDb] ❌ 没有 currentChild，无法写入数据库')
      return
    }

    try {
      // 直接使用 apiClient.patch 确保写入数据库
      const { apiClient } = await import('@/services/api')
      const result = await apiClient.patch('/children', { avatar: newAvatar }, {
        filters: [{ column: 'id', operator: 'eq', value: Number(child.id) }],
      })
      console.log('[syncAvatarToDb] ✅ 头像已写入数据库, child_id:', child.id, 'result:', result)

      // 同步 childStore
      useChildStore.getState().updateChild(String(child.id), { avatar: newAvatar })
    } catch (err) {
      console.error('[syncAvatarToDb] ❌ 写入数据库失败:', err)
    }
  }, [setAvatar])

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_AVATAR_SIZE) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 128; canvas.height = 128
        const ctx = canvas.getContext('2d')!
        const scale = Math.max(128 / img.width, 128 / img.height)
        const w = img.width * scale, h = img.height * scale
        ctx.drawImage(img, (128 - w) / 2, (128 - h) / 2, w, h)
        void syncAvatarToDb(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleModeChange = (mode: 'preset' | 'auto') => {
    setAgentMode(mode)
    if (mode === 'preset') {
      const presetIds = selectedAgentIds.filter((id) => agents.some((a) => a.id === id))
      const hasTeacher = presetIds.some((id) => agents.find((a) => a.id === id)?.role === 'teacher')
      if (!hasTeacher && teacherAgent) presetIds.unshift(teacherAgent.id)
      setSelectedAgentIds(presetIds.length > 0 ? presetIds : ['default-1', 'default-2', 'default-3'])
    }
  }

  const toggleAgent = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId)
    if (agent?.role === 'teacher') return
    if (selectedAgentIds.includes(agentId)) {
      setSelectedAgentIds(selectedAgentIds.filter((id) => id !== agentId))
    } else {
      setSelectedAgentIds([...selectedAgentIds, agentId])
    }
  }

  const maxTurnsNum = parseInt(maxTurns || '1')

  const sectionStyle: React.CSSProperties = {
    padding: '20px', borderRadius: T.cardRadius,
    backgroundColor: T.cardBg, boxShadow: T.cardShadow,
    marginBottom: '16px',
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '16px', fontWeight: 'bold', color: T.textDark,
    fontFamily: T.fontDisplay, margin: '0 0 14px',
    display: 'flex', alignItems: 'center', gap: '8px',
  }

  return (
    <div
      data-testid="classroom-settings"
      style={{
        padding: '24px 16px', maxWidth: '600px', margin: '0 auto',
        minHeight: '100vh', fontFamily: T.fontBody,
        paddingBottom: '100px', // 底部导航栏高度
      }}
    >
      {/* 页面标题 */}
      <h1 style={{
        fontSize: '26px', color: T.textDark, margin: '0 0 24px',
        fontFamily: T.fontDisplay, fontWeight: 'bold',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        🎓 课堂设置
      </h1>

      <p style={{
        fontSize: '13px', color: T.textLight, margin: '-16px 0 24px',
        lineHeight: 1.6,
      }}>
        配置即时生效，无需保存。下次上课时自动使用新设置。
      </p>

      {/* ═══ 1. 个人信息 ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
        style={sectionStyle}
      >
        <p style={sectionTitleStyle}>
          <span>👤</span> 个人信息
        </p>

        {/* 头像 + 名字行 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
          {/* 头像 */}
          <button
            type="button"
            onClick={() => setAvatarPickerOpen(!avatarPickerOpen)}
            style={{
              width: '56px', height: '56px', borderRadius: '50%',
              overflow: 'hidden', border: `3px solid ${T.violetLight}40`,
              cursor: 'pointer', flexShrink: 0, padding: 0,
              backgroundColor: '#F3F0FF', transition: 'border-color 0.2s',
            }}
          >
            <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </button>

          {/* 名字 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  ref={nameInputRef}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitName()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                  onBlur={commitName}
                  maxLength={20}
                  placeholder="输入昵称"
                  style={{
                    flex: 1, height: '36px', border: `2px solid ${T.violet}`,
                    borderRadius: '12px', padding: '0 12px',
                    fontSize: '15px', fontWeight: 600, color: T.textDark,
                    outline: 'none', fontFamily: T.fontBody,
                    backgroundColor: '#FDFBFF',
                  }}
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={commitName}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    border: 'none', backgroundColor: T.violet, color: '#FFF',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '16px',
                  }}
                >
                  ✓
                </motion.button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEditName}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  border: 'none', background: 'none', cursor: 'pointer',
                  padding: 0,
                }}
              >
                <span style={{
                  fontSize: '18px', fontWeight: 'bold', color: T.textDark,
                  fontFamily: T.fontDisplay,
                }}>
                  {nickname || '未设置昵称'}
                </span>
                <span style={{ fontSize: '14px', color: T.textLight }}>✏️</span>
              </button>
            )}
            <p style={{ fontSize: '11px', color: T.textLight, margin: '2px 0 0' }}>
              点击头像切换，点击名字编辑
            </p>
          </div>
        </div>

        {/* 头像选择器 */}
        <AnimatePresence>
          {avatarPickerOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '8px',
                padding: '12px 0', borderTop: '1px dashed #E8D6FF',
              }}>
                {AVATAR_OPTIONS.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => void syncAvatarToDb(url)}
                    style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      overflow: 'hidden', border: avatar === url
                        ? `3px solid ${T.violet}` : '2px solid #E0E0E0',
                      cursor: 'pointer', padding: 0, transition: 'all 0.15s',
                      backgroundColor: '#F8F8F8',
                    }}
                  >
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
                {/* 自定义上传 */}
                <label style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  border: '2px dashed #C0B0E0', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: '18px', color: T.violetLight,
                  backgroundColor: '#F8F4FF',
                }}>
                  +
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 自我介绍 */}
        <div style={{ marginTop: '12px' }}>
          <label style={{
            fontSize: '13px', color: T.textMedium, fontWeight: 600,
            display: 'block', marginBottom: '6px',
          }}>
            💬 自我介绍
          </label>
          <textarea
            value={bio}
            onChange={(e) => syncBioToDb(e.target.value)}
            placeholder="告诉 AI 老师关于你的情况，课堂内容会更贴合…"
            maxLength={200}
            rows={3}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '14px',
              border: '2px solid #FFE8D6', fontSize: '14px', fontFamily: T.fontBody,
              boxSizing: 'border-box', outline: 'none', backgroundColor: '#FFFCF8',
              color: T.textDark, resize: 'vertical', minHeight: '80px',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = T.violet }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#FFE8D6' }}
          />
          <p style={{
            fontSize: '11px', color: T.textLight, margin: '4px 0 0', textAlign: 'right',
          }}>
            {bio.length}/200
          </p>
        </div>
      </motion.div>

      {/* ═══ 2. 课堂角色模式 ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={sectionStyle}
      >
        <p style={sectionTitleStyle}>
          <span>🎭</span> 课堂模式
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          {([
            { value: 'preset' as const, label: '预设角色', emoji: '📋', desc: '选择老师和同学' },
            { value: 'auto' as const, label: '自动生成', emoji: '✨', desc: 'AI 自动匹配角色' },
          ]).map((mode) => (
            <motion.button
              key={mode.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleModeChange(mode.value)}
              style={{
                flex: 1, padding: '16px 12px', borderRadius: '16px',
                border: `2px solid ${agentMode === mode.value ? T.sunOrange : '#FFE8D6'}`,
                backgroundColor: agentMode === mode.value ? '#FFF3E7' : '#FFFFFF',
                cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{mode.emoji}</div>
              <div style={{
                fontSize: '14px', fontWeight: 'bold',
                color: agentMode === mode.value ? T.sunOrange : T.textMedium,
              }}>
                {mode.label}
              </div>
              <div style={{ fontSize: '11px', color: T.textLight, marginTop: '2px' }}>
                {mode.desc}
              </div>
            </motion.button>
          ))}
        </div>

        {agentMode === 'auto' && (
          <div style={{
            padding: '16px', borderRadius: '16px',
            backgroundColor: '#F8FBFF', border: '1.5px solid #D4E8FF',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '28px' }}>💡</span>
            <p style={{ fontSize: '13px', color: T.textMedium, margin: '8px 0 0' }}>
              自动模式下，AI 将根据课程内容自动创建最合适的课堂角色
            </p>
          </div>
        )}
      </motion.div>

      {/* ═══ 3. 老师音色 ═══ */}
      {agentMode === 'preset' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={sectionStyle}
        >
          <p style={sectionTitleStyle}>
            <span>👨‍🏫</span> 老师音色
          </p>

          {teacherAgent && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px', borderRadius: '14px',
              backgroundColor: '#F0F4FF', marginBottom: '12px',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                overflow: 'hidden', border: '2px solid #3b82f640',
              }}>
                <img src={teacherAgent.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: T.textDark }}>
                  {teacherAgent.name}
                </div>
                <div style={{ fontSize: '11px', color: T.textLight }}>主讲老师（必选）</div>
              </div>
              <span style={{
                fontSize: '11px', color: '#3b82f6', fontWeight: 'bold',
                padding: '2px 8px', borderRadius: '8px', backgroundColor: '#E8EEFF',
              }}>
                必选
              </span>
            </div>
          )}

          <VoicePicker
            label="教师语音"
            currentProviderId={ttsProviderId}
            currentVoiceId={ttsVoice}
            availableProviders={availableProviders}
            disabled={!ttsEnabled}
            accentColor="#3b82f6"
            onSelect={(providerId, voiceId, modelId) => {
              setTTSProvider(providerId)
              setTTSVoice(voiceId)
              if (modelId) setTTSProviderConfig(providerId, { modelId })
            }}
          />
        </motion.div>
      )}

      {/* ═══ 4. 课堂同学 ═══ */}
      {agentMode === 'preset' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={sectionStyle}
        >
          <p style={sectionTitleStyle}>
            <span>👫</span> 课堂同学
          </p>

          <p style={{ fontSize: '12px', color: T.textLight, margin: '-8px 0 12px' }}>
            选择和你一起上课的 AI 同学
          </p>

          {studentAgents.map((agent, idx) => {
            const isSelected = selectedAgentIds.includes(agent.id)
            const resolved = resolveAgentVoice(agent, idx + 1, availableProviders)
            return (
              <motion.div
                key={agent.id}
                layout
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                style={{
                  padding: '12px',
                  borderRadius: '18px',
                  border: `1.5px solid ${isSelected ? `${agent.color}40` : '#F0F0F0'}`,
                  backgroundColor: isSelected ? `${agent.color}08` : '#FAFAFA',
                  transition: 'all 0.2s',
                  opacity: isSelected ? 1 : 0.78,
                  marginBottom: '10px',
                  boxShadow: isSelected ? '0 8px 18px rgba(31, 41, 55, 0.06)' : 'none',
                }}
              >
                <div
                  onClick={() => toggleAgent(agent.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    minHeight: '52px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    style={{
                      width: '20px', height: '20px',
                      accentColor: agent.color || T.sunOrange,
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  />
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    overflow: 'hidden', border: `2px solid ${agent.color}30`,
                    flexShrink: 0,
                  }}>
                    <img src={agent.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 'bold',
                      color: T.textDark,
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {agent.name}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: T.textLight,
                      marginTop: '4px',
                    }}>
                      {agent.role === 'assistant' ? '课堂助教' : 'AI 同学'}
                    </div>
                  </div>
                  {isSelected && (
                    <span style={{
                      fontSize: '11px',
                      color: agent.color || T.sunOrange,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '999px',
                      backgroundColor: `${agent.color || T.sunOrange}14`,
                      flexShrink: 0,
                    }}>
                      已加入
                    </span>
                  )}
                </div>

                {isSelected && ttsEnabled && availableProviders.length > 0 && (
                  <div
                    style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: `1px dashed ${agent.color}30`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <VoicePicker
                      label="同学音色"
                      currentProviderId={resolved.providerId}
                      currentVoiceId={resolved.voiceId}
                      availableProviders={availableProviders}
                      accentColor={agent.color || T.sunOrange}
                      onSelect={(providerId, voiceId, modelId) => {
                        updateAgent(agent.id, {
                          voiceConfig: {
                            providerId,
                            modelId: modelId || undefined,
                            voiceId,
                          },
                        })
                      }}
                    />
                  </div>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* ═══ 5. 讨论轮数 ═══ */}
      {agentMode === 'preset' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={sectionStyle}
        >
          <p style={sectionTitleStyle}>
            <span>💬</span> 讨论轮数
          </p>

          <p style={{ fontSize: '12px', color: T.textLight, margin: '-8px 0 16px' }}>
            每个环节中，AI 同学之间的最大讨论次数
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px',
          }}>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                const v = Math.max(1, maxTurnsNum - 1)
                setMaxTurns(String(v))
              }}
              style={{
                width: '44px', height: '44px', borderRadius: '50%',
                border: `2px solid #FFE8D6`, backgroundColor: '#FFFCF8',
                cursor: 'pointer', fontSize: '20px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: T.sunOrange, fontWeight: 'bold',
              }}
            >
              −
            </motion.button>

            <div style={{
              width: '60px', height: '60px', borderRadius: '16px',
              backgroundColor: '#FFF3E7', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${T.sunOrange}40`,
            }}>
              <span style={{
                fontSize: '28px', fontWeight: 'bold', color: T.sunOrange,
                fontFamily: T.fontDisplay,
              }}>
                {maxTurnsNum}
              </span>
            </div>

            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                const v = Math.min(20, maxTurnsNum + 1)
                setMaxTurns(String(v))
              }}
              style={{
                width: '44px', height: '44px', borderRadius: '50%',
                border: `2px solid #FFE8D6`, backgroundColor: '#FFFCF8',
                cursor: 'pointer', fontSize: '20px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: T.sunOrange, fontWeight: 'bold',
              }}
            >
              +
            </motion.button>
          </div>

          <p style={{
            fontSize: '11px', color: T.textLight, textAlign: 'center', margin: '10px 0 0',
          }}>
            范围：1 ~ 20 轮
          </p>
        </motion.div>
      )}

    </div>
  )
}
