/**
 * 家长日志页面 — 分类展示系统日志
 * 用户操作日志 / 程序运行日志 / 模型调用日志
 */

import { useState, useCallback, useSyncExternalStore, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  getLogBuffer,
  subscribeLogBuffer,
  clearLogBuffer,
  type LogEntry,
} from '@/lib/openmaic/logger'

const T = {
  fontDisplay: "'Baloo 2', 'Nunito', sans-serif",
  fontBody: "'Nunito', 'PingFang SC', sans-serif",
  fontMono: "'SF Mono', 'Fira Code', 'Consolas', monospace",
  sunOrange: '#FF8C42',
  skyBlue: '#5BC0EB',
  grassGreen: '#2EC4B6',
  candyPink: '#FF6B9D',
  starGold: '#FFC845',
  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  errorRed: '#FF6B6B',
  cardBg: '#FFFFFF',
}

type LogCategory = 'all' | 'user' | 'system' | 'model'

interface CategoryConfig {
  key: LogCategory
  label: string
  emoji: string
  color: string
  bg: string
  tags: string[]
}

const USER_TAGS = [
  'AuthStore', 'AuthApi', 'ChatSessions', 'PromptInput', 'QuizView',
  'PBLChat', 'Settings', 'TTSSettings', 'ASRSettings', 'AudioSettings',
  'ISESettings', 'SettingsSync', 'SettingsReverseSync',
]

const MODEL_TAGS = [
  'LLM', 'AISdkAdapter', 'AIProviders', 'AITeacher', 'AIQuestionGen',
  'DirectorGraph', 'DirectorPrompt', 'SSEStream', 'PipelineClient',
  'MediaOrchestrator', 'MediaGenerationStore',
  'Generation', 'StatelessGenerate', 'PromptLoader',
  'PreGeneration',
]

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'all', label: '全部日志', emoji: '📋', color: T.textDark,
    bg: 'linear-gradient(135deg, #F0F0F5, #E8E8F0)', tags: [],
  },
  {
    key: 'user', label: '用户操作', emoji: '👤', color: T.skyBlue,
    bg: 'linear-gradient(135deg, #C8E9FA, #E0F2FE)', tags: USER_TAGS,
  },
  {
    key: 'system', label: '程序运行', emoji: '⚙️', color: T.grassGreen,
    bg: 'linear-gradient(135deg, #C8F7F1, #DEFFF9)', tags: [],
  },
  {
    key: 'model', label: '模型调用', emoji: '🤖', color: T.candyPink,
    bg: 'linear-gradient(135deg, #FFE0F0, #FFF0F8)', tags: MODEL_TAGS,
  },
]

const LEVEL_COLORS: Record<string, { text: string; bg: string }> = {
  info: { text: '#3b82f6', bg: '#EFF6FF' },
  warn: { text: '#f59e0b', bg: '#FFFBEB' },
  error: { text: '#ef4444', bg: '#FEF2F2' },
  debug: { text: '#6b7280', bg: '#F9FAFB' },
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour12: false }) +
    '.' + String(d.getMilliseconds()).padStart(3, '0')
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function categorizeEntry(entry: LogEntry): LogCategory {
  if (USER_TAGS.includes(entry.tag)) return 'user'
  if (MODEL_TAGS.includes(entry.tag)) return 'model'
  return 'system'
}

function useLogEntries(): readonly LogEntry[] {
  return useSyncExternalStore(subscribeLogBuffer, getLogBuffer, getLogBuffer)
}

export function ParentLogs() {
  const navigate = useNavigate()
  const entries = useLogEntries()
  const [activeCategory, setActiveCategory] = useState<LogCategory>('all')
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null)

  const filteredEntries = useMemo(() => {
    const sorted = [...entries].reverse()
    if (activeCategory === 'all') return sorted
    return sorted.filter((e) => categorizeEntry(e) === activeCategory)
  }, [entries, activeCategory])

  const categoryCounts = useMemo(() => {
    const counts: Record<LogCategory, number> = { all: entries.length, user: 0, system: 0, model: 0 }
    for (const e of entries) {
      counts[categorizeEntry(e)]++
    }
    return counts
  }, [entries])

  const handleCopy = useCallback(() => {
    const text = filteredEntries
      .map((e) => `[${formatTime(e.timestamp)}] [${e.level.toUpperCase()}] [${e.tag}] ${e.message}`)
      .join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }, [filteredEntries])

  return (
    <div style={{
      minHeight: '100vh', fontFamily: T.fontBody,
      background: 'linear-gradient(170deg, #FFF8E7 0%, #FFE8D6 30%, #FFDEE9 60%, #D4F1F9 100%)',
    }}>
      {/* 顶栏 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/parent')}
          style={{
            width: '36px', height: '36px', borderRadius: '12px',
            border: '1.5px solid #FFE8D6', backgroundColor: T.cardBg,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '16px', flexShrink: 0,
          }}
        >
          ←
        </motion.button>
        <h1 style={{
          fontSize: '20px', color: T.textDark, margin: 0, flex: 1,
          fontFamily: T.fontDisplay, fontWeight: 'bold',
        }}>
          📋 系统日志
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleCopy}
            style={{
              padding: '6px 12px', borderRadius: '12px',
              border: '1.5px solid #E0E0E8', backgroundColor: T.cardBg,
              cursor: 'pointer', fontSize: '12px', color: T.textMedium,
              fontFamily: T.fontBody, fontWeight: 600,
            }}
          >
            复制
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={clearLogBuffer}
            style={{
              padding: '6px 12px', borderRadius: '12px',
              border: `1.5px solid ${T.errorRed}33`,
              backgroundColor: '#FFF0F0', color: T.errorRed,
              cursor: 'pointer', fontSize: '12px',
              fontFamily: T.fontBody, fontWeight: 600,
            }}
          >
            清空
          </motion.button>
        </div>
      </div>

      <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
        {/* 分类标签 */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px', marginBottom: '16px',
        }}>
          {CATEGORIES.map((cat) => (
            <motion.button
              key={cat.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: '12px 6px', borderRadius: '16px',
                border: activeCategory === cat.key ? `2px solid ${cat.color}` : '2px solid transparent',
                background: cat.bg, cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '4px',
                opacity: activeCategory === cat.key ? 1 : 0.7,
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '18px' }}>{cat.emoji}</span>
              <span style={{
                fontSize: '11px', fontWeight: 600, color: cat.color,
                fontFamily: T.fontBody,
              }}>
                {cat.label}
              </span>
              <span style={{
                fontSize: '10px', color: T.textLight,
                fontFamily: T.fontMono,
              }}>
                {categoryCounts[cat.key]}
              </span>
            </motion.button>
          ))}
        </div>

        {/* 统计概要 */}
        <div style={{
          padding: '12px 16px', borderRadius: '16px',
          backgroundColor: T.cardBg, marginBottom: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '13px', color: T.textMedium, fontWeight: 600 }}>
            {activeCategory === 'all' ? '全部' : CATEGORIES.find((c) => c.key === activeCategory)?.label} — {filteredEntries.length} 条
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['error', 'warn', 'info'].map((level) => {
              const count = filteredEntries.filter((e) => e.level === level).length
              if (count === 0) return null
              const style = LEVEL_COLORS[level]
              return (
                <span key={level} style={{
                  padding: '2px 8px', borderRadius: '8px',
                  backgroundColor: style.bg, color: style.text,
                  fontSize: '11px', fontWeight: 600,
                }}>
                  {level.toUpperCase()} {count}
                </span>
              )
            })}
          </div>
        </div>

        {/* 日志列表 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredEntries.length === 0 && (
            <div style={{
              padding: '48px 16px', textAlign: 'center',
              color: T.textLight, fontSize: '14px',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
              暂无日志记录
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {filteredEntries.map((entry, i) => {
              const levelStyle = LEVEL_COLORS[entry.level] || LEVEL_COLORS.info
              const category = categorizeEntry(entry)
              const catConfig = CATEGORIES.find((c) => c.key === category)!
              const isExpanded = expandedEntry === i

              return (
                <motion.div
                  key={`${entry.timestamp}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setExpandedEntry(isExpanded ? null : i)}
                  style={{
                    padding: '12px 14px', borderRadius: '14px',
                    backgroundColor: T.cardBg, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    border: isExpanded ? `1.5px solid ${catConfig.color}33` : '1.5px solid transparent',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* 头部 */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    marginBottom: isExpanded ? '8px' : '4px',
                  }}>
                    <span style={{
                      padding: '2px 6px', borderRadius: '6px',
                      backgroundColor: levelStyle.bg, color: levelStyle.text,
                      fontSize: '10px', fontWeight: 700,
                      fontFamily: T.fontMono, flexShrink: 0,
                    }}>
                      {entry.level.toUpperCase()}
                    </span>
                    <span style={{
                      fontSize: '11px', color: catConfig.color,
                      fontWeight: 600, flexShrink: 0,
                    }}>
                      {catConfig.emoji} {entry.tag}
                    </span>
                    <span style={{ flex: 1 }} />
                    <span style={{
                      fontSize: '10px', color: T.textLight,
                      fontFamily: T.fontMono, flexShrink: 0,
                    }}>
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>

                  {/* 消息摘要 */}
                  <div style={{
                    fontSize: '12px', color: T.textMedium,
                    lineHeight: '18px', fontFamily: T.fontBody,
                    overflow: isExpanded ? 'visible' : 'hidden',
                    textOverflow: isExpanded ? 'unset' : 'ellipsis',
                    whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
                    wordBreak: isExpanded ? 'break-all' : 'normal',
                  }}>
                    {entry.message}
                  </div>

                  {/* 展开后的详情 */}
                  {isExpanded && (
                    <div style={{
                      marginTop: '8px', padding: '8px 10px',
                      borderRadius: '8px', backgroundColor: '#F8F9FC',
                      fontSize: '11px', fontFamily: T.fontMono,
                      color: T.textMedium, lineHeight: '16px',
                    }}>
                      <div>日期: {formatDate(entry.timestamp)}</div>
                      <div>时间: {formatTime(entry.timestamp)}</div>
                      <div>级别: {entry.level.toUpperCase()}</div>
                      <div>标签: {entry.tag}</div>
                      <div>分类: {catConfig.label}</div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* 底部说明 */}
        <div style={{
          padding: '24px 16px', textAlign: 'center',
          color: T.textLight, fontSize: '12px',
        }}>
          日志缓冲区最多保留 200 条记录
        </div>
      </div>
    </div>
  )
}
