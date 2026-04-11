/**
 * 课堂设置页面 — Sunny Playground 风格
 *
 * 直接复用 OpenMAIC 原生组件和 Store，配置即时生效：
 * - UserProfileCard → 头像 / 昵称 / 自我介绍
 * - AgentBar → 老师音色 / 预设&自动模式 / 角色音色 / 讨论轮数 / 同学选择
 *
 * 所有操作直接写入 OpenMAIC 的三个 Store：
 *   useSettingsStore（Agent 设置、TTS 配置）
 *   useAgentRegistry（角色注册表）
 *   useUserProfileStore（用户头像/昵称/简介）
 * 无需经过 settings-sync 桥接，配置在 localStorage 中持久化。
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useSettingsStore } from '@/stores/openmaic/settings'
import { useAgentRegistry } from '@/lib/openmaic/orchestration/registry/store'
import { useUserProfileStore, AVATAR_OPTIONS } from '@/stores/openmaic/user-profile'
import { resolveAgentVoice, getAvailableProvidersWithVoices } from '@/lib/openmaic/audio/voice-resolver'
import { playBrowserTTSPreview } from '@/lib/openmaic/audio/browser-tts-preview'
import type { AgentConfig } from '@/lib/openmaic/orchestration/registry/types'
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

/* ═══════════════════════════════════════════
   迷你音色选择器（内联版本，适配 Sunny Playground 风格）
   ═══════════════════════════════════════════ */

function VoicePicker({
  label,
  currentProviderId,
  currentVoiceId,
  availableProviders,
  onSelect,
  disabled,
  accentColor = T.sunOrange,
}: {
  label: string
  currentProviderId: string
  currentVoiceId: string
  availableProviders: ProviderWithVoices[]
  onSelect: (providerId: TTSProviderId, voiceId: string, modelId?: string) => void
  disabled?: boolean
  accentColor?: string
}) {
  const [open, setOpen] = useState(false)
  const [previewingKey, setPreviewingKey] = useState<string | null>(null)
  const previewCancelRef = useRef<(() => void) | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const previewAbortRef = useRef<AbortController | null>(null)
  const ttsProvidersConfig = useSettingsStore((s) => s.ttsProvidersConfig)

  const displayName = (() => {
    for (const p of availableProviders) {
      if (p.providerId === currentProviderId) {
        const v = p.voices.find((voice) => voice.id === currentVoiceId)
        if (v) return v.name
      }
    }
    return currentVoiceId || '默认'
  })()

  const stopPreview = useCallback(() => {
    previewCancelRef.current?.()
    previewCancelRef.current = null
    previewAbortRef.current?.abort()
    previewAbortRef.current = null
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current.src = ''
      previewAudioRef.current = null
    }
    setPreviewingKey(null)
  }, [])

  const handlePreview = useCallback(
    async (providerId: TTSProviderId, voiceId: string, modelId?: string) => {
      const key = `${providerId}::${voiceId}`
      if (previewingKey === key) { stopPreview(); return }
      stopPreview()
      setPreviewingKey(key)
      const previewText = '欢迎来到AI课堂'
      if (providerId === 'browser-native-tts') {
        const { promise, cancel } = playBrowserTTSPreview({ text: previewText, voice: voiceId })
        previewCancelRef.current = cancel
        try { await promise } catch { /* ignore */ }
        setPreviewingKey(null)
        return
      }
      try {
        const controller = new AbortController()
        previewAbortRef.current = controller
        const providerConfig = ttsProvidersConfig[providerId]
        const res = await fetch('/api/generate/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: previewText, audioId: 'voice-preview',
            ttsProviderId: providerId,
            ttsModelId: modelId || providerConfig?.modelId,
            ttsVoice: voiceId, ttsSpeed: 1,
            ttsApiKey: providerConfig?.apiKey,
            ttsBaseUrl: providerConfig?.serverBaseUrl || providerConfig?.baseUrl,
          }),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('TTS error')
        const data = await res.json()
        if (!data.base64) throw new Error('No audio')
        const audio = new Audio(`data:audio/${data.format || 'mp3'};base64,${data.base64}`)
        previewAudioRef.current = audio
        audio.addEventListener('ended', () => setPreviewingKey(null))
        audio.addEventListener('error', () => setPreviewingKey(null))
        await audio.play()
      } catch { setPreviewingKey(null) }
    },
    [previewingKey, stopPreview, ttsProvidersConfig],
  )

  useEffect(() => () => stopPreview(), [stopPreview])

  if (disabled) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 14px', borderRadius: '14px',
        border: '1.5px solid #E0E0E0', backgroundColor: '#F8F8F8',
        opacity: 0.5,
      }}>
        <span style={{ fontSize: '13px', color: T.textLight }}>{label}</span>
        <span style={{ fontSize: '13px', color: T.textLight, marginLeft: 'auto' }}>🔇 TTS 已关闭</span>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 14px', borderRadius: '14px',
          border: `1.5px solid ${open ? accentColor : '#FFE8D6'}`,
          backgroundColor: open ? `${accentColor}08` : '#FFFCF8',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        <span style={{ fontSize: '14px' }}>🔊</span>
        <span style={{ fontSize: '13px', color: T.textMedium, fontWeight: 600 }}>{label}</span>
        <span style={{
          marginLeft: 'auto', fontSize: '13px', color: accentColor, fontWeight: 600,
          padding: '2px 10px', borderRadius: '10px',
          backgroundColor: `${accentColor}12`,
        }}>
          {displayName}
        </span>
        <span style={{
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s', fontSize: '10px', color: T.textLight,
        }}>▼</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              marginTop: '6px', padding: '8px',
              borderRadius: '14px', border: '1px solid #FFE8D6',
              backgroundColor: '#FFFAF5', maxHeight: '240px', overflowY: 'auto',
            }}>
              {availableProviders.map((provider) =>
                provider.modelGroups.map((group) => (
                  <div key={`${provider.providerId}::${group.modelId}`}>
                    <div style={{
                      fontSize: '11px', color: T.textLight, fontWeight: 600,
                      padding: '6px 8px', position: 'sticky', top: 0,
                      backgroundColor: '#FFFAF5',
                    }}>
                      {group.modelId
                        ? `${provider.providerName} · ${group.modelName}`
                        : provider.providerName}
                    </div>
                    {group.voices.map((voice) => {
                      const isActive = currentProviderId === provider.providerId && currentVoiceId === voice.id
                      const previewKey = `${provider.providerId}::${voice.id}`
                      const isPreviewing = previewingKey === previewKey
                      return (
                        <div
                          key={previewKey}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 8px', borderRadius: '10px',
                            backgroundColor: isActive ? `${accentColor}12` : 'transparent',
                            cursor: 'pointer', transition: 'background 0.15s',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelect(provider.providerId, voice.id, group.modelId || undefined)
                              setOpen(false)
                            }}
                            style={{
                              flex: 1, textAlign: 'left', fontSize: '13px',
                              color: isActive ? accentColor : T.textDark,
                              fontWeight: isActive ? 600 : 400,
                              border: 'none', background: 'none', cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {voice.name}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePreview(provider.providerId, voice.id, group.modelId)
                            }}
                            style={{
                              width: '24px', height: '24px', borderRadius: '50%',
                              border: 'none', cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              backgroundColor: isPreviewing ? `${accentColor}20` : 'transparent',
                              color: isPreviewing ? accentColor : T.textLight,
                              fontSize: '12px',
                            }}
                          >
                            {isPreviewing ? '⏹' : '▶'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )),
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
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

  // 浏览器 TTS voices
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const loadVoices = () => setBrowserVoices(speechSynthesis.getVoices())
    loadVoices()
    speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [])

  // 构建可用的 TTS 提供商列表
  const serverProviders = getAvailableProvidersWithVoices(ttsProvidersConfig)
  const availableProviders: ProviderWithVoices[] = [
    ...serverProviders,
    ...(browserVoices.length > 0
      ? [{
          providerId: 'browser-native-tts' as TTSProviderId,
          providerName: 'Browser Native',
          voices: browserVoices.map((v) => ({ id: v.voiceURI, name: v.name })),
          modelGroups: [{
            modelId: '',
            modelName: 'Browser Native',
            voices: browserVoices.map((v) => ({ id: v.voiceURI, name: v.name })),
          }],
        }]
      : []),
  ]

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

  const commitName = () => {
    setNickname(nameDraft.trim())
    setEditingName(false)
  }

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
        setAvatar(canvas.toDataURL('image/jpeg', 0.85))
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
                    onClick={() => setAvatar(url)}
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
            onChange={(e) => setBio(e.target.value)}
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
              <div key={agent.id} style={{ marginBottom: '8px' }}>
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleAgent(agent.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px', borderRadius: '14px',
                    border: `1.5px solid ${isSelected ? `${agent.color}40` : '#F0F0F0'}`,
                    backgroundColor: isSelected ? `${agent.color}08` : '#FAFAFA',
                    cursor: 'pointer', transition: 'all 0.2s',
                    opacity: isSelected ? 1 : 0.7,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    style={{
                      width: '20px', height: '20px',
                      accentColor: agent.color || T.sunOrange,
                      cursor: 'pointer',
                    }}
                  />
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    overflow: 'hidden', border: `2px solid ${agent.color}30`,
                    flexShrink: 0,
                  }}>
                    <img src={agent.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: T.textDark }}>
                      {agent.name}
                    </div>
                    <div style={{
                      fontSize: '11px', color: T.textLight,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {agent.role === 'assistant' ? '助教' : '同学'}
                    </div>
                  </div>
                </motion.div>

                {/* 选中时显示音色选择器 */}
                {isSelected && ttsEnabled && availableProviders.length > 0 && (
                  <div style={{ marginTop: '4px', marginLeft: '30px' }}>
                    <VoicePicker
                      label={`${agent.name} 的声音`}
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
              </div>
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

      {/* 底部提示 */}
      <div style={{
        textAlign: 'center', padding: '20px 0',
        fontSize: '12px', color: T.textLight,
      }}>
        ✨ 所有设置自动保存，即时生效
      </div>
    </div>
  )
}
