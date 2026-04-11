import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Play, Square, Volume2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/openmaic/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/openmaic/ui/select'
import { playBrowserTTSPreview } from '@/lib/openmaic/audio/browser-tts-preview'
import { useSettingsStore } from '@/lib/openmaic/store/settings'
import type { ProviderWithVoices } from '@/lib/openmaic/audio/voice-resolver'
import type { TTSProviderId } from '@/lib/openmaic/audio/types'

const UI = {
  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  border: '#FFE8D6',
  softBg: '#FFFCF8',
  popoverBg: '#FFF8F1',
}

interface VoiceGroupOption {
  key: string
  providerId: TTSProviderId
  providerName: string
  modelId?: string
  label: string
  voices: Array<{ id: string; name: string }>
}

export interface VoicePickerProps {
  label: string
  currentProviderId: string
  currentVoiceId: string
  availableProviders: ProviderWithVoices[]
  onSelect: (providerId: TTSProviderId, voiceId: string, modelId?: string) => void
  disabled?: boolean
  accentColor?: string
}

export function VoicePicker({
  label,
  currentProviderId,
  currentVoiceId,
  availableProviders,
  onSelect,
  disabled,
  accentColor = '#FF8C42',
}: VoicePickerProps) {
  const [open, setOpen] = useState(false)
  const [previewingKey, setPreviewingKey] = useState<string | null>(null)
  const previewCancelRef = useRef<(() => void) | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const previewAbortRef = useRef<AbortController | null>(null)
  const ttsProvidersConfig = useSettingsStore((s) => s.ttsProvidersConfig)

  const voiceGroups = useMemo<VoiceGroupOption[]>(() => {
    return availableProviders.flatMap((provider) =>
      provider.modelGroups.map((group) => ({
        key: `${provider.providerId}::${group.modelId || 'default'}`,
        providerId: provider.providerId,
        providerName: provider.providerName,
        modelId: group.modelId || undefined,
        label: group.modelId ? `${provider.providerName} · ${group.modelName}` : provider.providerName,
        voices: group.voices,
      })),
    )
  }, [availableProviders])

  const displayName = useMemo(() => {
    for (const provider of availableProviders) {
      if (provider.providerId !== currentProviderId) continue
      const voice = provider.voices.find((item) => item.id === currentVoiceId)
      if (voice) return voice.name
      for (const group of provider.modelGroups) {
        const groupVoice = group.voices.find((item) => item.id === currentVoiceId)
        if (groupVoice) return groupVoice.name
      }
    }
    return voiceGroups[0]?.voices[0]?.name || currentVoiceId || '请选择音色'
  }, [availableProviders, currentProviderId, currentVoiceId, voiceGroups])

  const currentGroupKey = useMemo(() => {
    const matched = voiceGroups.find(
      (group) => group.providerId === currentProviderId && group.voices.some((voice) => voice.id === currentVoiceId),
    )
    return matched?.key || voiceGroups[0]?.key || ''
  }, [voiceGroups, currentProviderId, currentVoiceId])

  const [selectedGroupKey, setSelectedGroupKey] = useState(currentGroupKey)

  useEffect(() => {
    setSelectedGroupKey(currentGroupKey)
  }, [currentGroupKey])

  const activeGroup = voiceGroups.find((group) => group.key === selectedGroupKey) || voiceGroups[0]

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
      if (previewingKey === key) {
        stopPreview()
        return
      }

      stopPreview()
      setPreviewingKey(key)
      const previewText = '欢迎来到AI课堂'

      if (providerId === 'browser-native-tts') {
        const { promise, cancel } = playBrowserTTSPreview({ text: previewText, voice: voiceId })
        previewCancelRef.current = cancel
        try {
          await promise
        } catch {
          // ignore preview errors
        }
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
            text: previewText,
            audioId: 'voice-preview',
            ttsProviderId: providerId,
            ttsModelId: modelId || providerConfig?.modelId,
            ttsVoice: voiceId,
            ttsSpeed: 1,
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
        audio.addEventListener('ended', () => setPreviewingKey(null), { once: true })
        audio.addEventListener('error', () => setPreviewingKey(null), { once: true })
        await audio.play()
      } catch {
        setPreviewingKey(null)
      }
    },
    [previewingKey, stopPreview, ttsProvidersConfig],
  )

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        stopPreview()
      } else if (currentGroupKey) {
        setSelectedGroupKey(currentGroupKey)
      }
      setOpen(nextOpen)
    },
    [currentGroupKey, stopPreview],
  )

  useEffect(() => () => stopPreview(), [stopPreview])

  if (disabled) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        borderRadius: '16px',
        border: '1.5px solid #EADFD3',
        backgroundColor: '#F8F8F8',
        opacity: 0.55,
      }}>
        <span style={{ fontSize: '13px', color: UI.textLight }}>{label}</span>
        <span style={{ fontSize: '13px', color: UI.textLight, marginLeft: 'auto' }}>🔇 TTS 已关闭</span>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="voice-picker-trigger"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '16px',
            border: `1.5px solid ${open ? accentColor : UI.border}`,
            backgroundColor: open ? `${accentColor}10` : UI.softBg,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: open ? `0 10px 24px ${accentColor}18` : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '12px',
              backgroundColor: `${accentColor}14`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Volume2 size={16} color={accentColor} />
            </div>
            <div style={{ minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontSize: '12px', color: UI.textMedium, fontWeight: 700 }}>
                {label}
              </div>
              <div style={{
                fontSize: '13px',
                color: accentColor,
                fontWeight: 700,
                marginTop: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {displayName}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}>
            {activeGroup && (
              <span style={{
                maxWidth: '128px',
                padding: '4px 10px',
                borderRadius: '999px',
                backgroundColor: '#FFFFFF',
                color: UI.textMedium,
                fontSize: '11px',
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {activeGroup.providerName}
              </span>
            )}
            <ChevronDown
              size={16}
              color={UI.textLight}
              style={{
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={10}
        className="w-[340px] border-none bg-transparent p-0 shadow-none"
      >
        <div
          data-testid="voice-picker-popover-content"
          style={{
            borderRadius: '22px',
            border: `1px solid ${accentColor}20`,
            background: 'linear-gradient(180deg, #FFFDF9 0%, #FFF6EC 100%)',
            boxShadow: '0 18px 40px rgba(45, 49, 66, 0.16)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '16px 16px 12px',
            borderBottom: `1px solid ${accentColor}14`,
          }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: UI.textDark }}>
              {label}
            </div>
            <div style={{ fontSize: '12px', color: UI.textMedium, marginTop: '4px' }}>
              通过公共弹层选择音色，打开时不会再压住其他卡片
            </div>
          </div>

          {voiceGroups.length > 1 && (
            <div style={{ padding: '14px 14px 10px' }}>
              <div style={{
                fontSize: '11px',
                color: UI.textLight,
                fontWeight: 700,
                marginBottom: '8px',
              }}>
                语音分组
              </div>
              <Select value={activeGroup?.key} onValueChange={setSelectedGroupKey}>
                <SelectTrigger className="h-11 w-full rounded-2xl border-none bg-white text-sm shadow-sm">
                  <SelectValue placeholder="选择语音分组" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-80 rounded-2xl">
                  {voiceGroups.map((group) => (
                    <SelectItem key={group.key} value={group.key} className="text-sm">
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div style={{ padding: '0 10px 10px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 6px 8px',
            }}>
              <span style={{ fontSize: '11px', color: UI.textLight, fontWeight: 700 }}>
                可选音色
              </span>
              {activeGroup?.label && (
                <span style={{ fontSize: '11px', color: accentColor, fontWeight: 700 }}>
                  {activeGroup.label}
                </span>
              )}
            </div>

            <div style={{ maxHeight: '260px', overflowY: 'auto', padding: '2px 4px 6px' }}>
              {activeGroup?.voices.length ? activeGroup.voices.map((voice) => {
                const previewKey = `${activeGroup.providerId}::${voice.id}`
                const isActive = currentProviderId === activeGroup.providerId && currentVoiceId === voice.id
                const isPreviewing = previewingKey === previewKey
                return (
                  <div
                    key={previewKey}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px',
                      borderRadius: '16px',
                      backgroundColor: isActive ? `${accentColor}10` : 'transparent',
                      marginBottom: '4px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(activeGroup.providerId, voice.id, activeGroup.modelId)
                        handleOpenChange(false)
                      }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        padding: '8px 10px',
                        borderRadius: '14px',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <span style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: isActive ? 800 : 600,
                          color: isActive ? accentColor : UI.textDark,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {voice.name}
                        </span>
                      </span>
                      {isActive && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: accentColor,
                          fontSize: '11px',
                          fontWeight: 800,
                          flexShrink: 0,
                        }}>
                          <Check size={14} /> 当前
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      aria-label={`试听 ${voice.name}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        handlePreview(activeGroup.providerId, voice.id, activeGroup.modelId)
                      }}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isPreviewing ? `${accentColor}18` : '#FFFFFF',
                        color: isPreviewing ? accentColor : UI.textMedium,
                        boxShadow: '0 4px 10px rgba(45, 49, 66, 0.08)',
                        flexShrink: 0,
                      }}
                    >
                      {isPreviewing ? <Square size={14} /> : <Play size={14} />}
                    </button>
                  </div>
                )
              }) : (
                <div style={{
                  padding: '18px 12px',
                  textAlign: 'center',
                  color: UI.textLight,
                  fontSize: '12px',
                }}>
                  当前没有可用音色
                </div>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
