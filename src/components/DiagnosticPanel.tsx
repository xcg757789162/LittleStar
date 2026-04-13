/**
 * DiagnosticPanel — 开发/调试用的实时日志面板
 *
 * 快捷键 Ctrl+Shift+D (或 Cmd+Shift+D) 切换显示。
 * 展示 logger 的环形缓冲区内容，支持按级别过滤和一键复制。
 * 生产环境可通过 VITE_DISABLE_DIAG=true 禁用。
 */

import { useState, useEffect, useCallback, useSyncExternalStore, useRef } from 'react'
import {
  getLogBuffer,
  subscribeLogBuffer,
  clearLogBuffer,
  type LogEntry,
} from '@/lib/openmaic/logger'

const LEVEL_COLORS: Record<string, string> = {
  info: '#3b82f6',
  warn: '#f59e0b',
  error: '#ef4444',
  debug: '#6b7280',
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

function useLogEntries(): readonly LogEntry[] {
  return useSyncExternalStore(subscribeLogBuffer, getLogBuffer, getLogBuffer)
}

export function DiagnosticPanel() {
  const [visible, setVisible] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const bottomRef = useRef<HTMLDivElement>(null)
  const entries = useLogEntries()

  const toggle = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
      e.preventDefault()
      setVisible((v) => !v)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', toggle)
    return () => window.removeEventListener('keydown', toggle)
  }, [toggle])

  useEffect(() => {
    if (visible) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [entries.length, visible])

  const handleCopy = useCallback(() => {
    const text = entries
      .map((e) => `[${formatTime(e.timestamp)}] [${e.level.toUpperCase()}] [${e.tag}] ${e.message}`)
      .join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }, [entries])

  if (!visible) return null

  const filtered = filter === 'all'
    ? entries
    : entries.filter((e) => e.level === filter)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '280px',
        background: 'rgba(15, 15, 20, 0.95)',
        backdropFilter: 'blur(8px)',
        color: '#e0e0e0',
        fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
        fontSize: '12px',
        lineHeight: '18px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>Diagnostics</span>
        <span style={{ color: '#666', fontSize: '11px' }}>Ctrl+Shift+D to close</span>
        <div style={{ flex: 1 }} />
        {(['all', 'info', 'warn', 'error'] as const).map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            style={{
              padding: '1px 8px',
              borderRadius: '3px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px',
              background: filter === level ? 'rgba(255,255,255,0.15)' : 'transparent',
              color: level === 'all' ? '#ccc' : LEVEL_COLORS[level],
            }}
          >
            {level.toUpperCase()}
            {level !== 'all' && ` (${entries.filter((e) => e.level === level).length})`}
          </button>
        ))}
        <button
          onClick={handleCopy}
          title="复制全部日志"
          style={{
            padding: '1px 8px', borderRadius: '3px', border: 'none',
            cursor: 'pointer', fontSize: '11px', background: 'rgba(255,255,255,0.08)', color: '#ccc',
          }}
        >
          Copy
        </button>
        <button
          onClick={clearLogBuffer}
          title="清空日志"
          style={{
            padding: '1px 8px', borderRadius: '3px', border: 'none',
            cursor: 'pointer', fontSize: '11px', background: 'rgba(255,255,255,0.08)', color: '#ccc',
          }}
        >
          Clear
        </button>
        <button
          onClick={() => setVisible(false)}
          style={{
            padding: '1px 8px', borderRadius: '3px', border: 'none',
            cursor: 'pointer', fontSize: '11px', background: 'rgba(239,68,68,0.2)', color: '#ef4444',
          }}
        >
          Close
        </button>
      </div>

      {/* Log entries */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 12px' }}>
        {filtered.length === 0 && (
          <div style={{ color: '#555', padding: '20px 0', textAlign: 'center' }}>
            暂无日志记录
          </div>
        )}
        {filtered.map((entry, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            <span style={{ color: '#555', flexShrink: 0 }}>{formatTime(entry.timestamp)}</span>
            <span style={{
              color: LEVEL_COLORS[entry.level] || '#888',
              flexShrink: 0,
              width: '40px',
              fontWeight: entry.level === 'error' ? 'bold' : 'normal',
            }}>
              {entry.level.toUpperCase()}
            </span>
            <span style={{ color: '#8b5cf6', flexShrink: 0 }}>[{entry.tag}]</span>
            <span style={{ color: entry.level === 'error' ? '#fca5a5' : '#d1d5db' }}>
              {entry.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
