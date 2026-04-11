/**
 * 家长高级设置 — Sunny Playground 风格
 *
 * 保留内容：
 *   1. 孩子信息（名字+年龄） — 支持编辑
 *   2. 年级解锁条件配置 — 可调节
 *   3. AI 服务设置面板入口
 *
 * 设计：温暖明快的儿童向风格，圆角卡片+柔和渐变+微交互动画
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useChildStore } from '@/stores/childStore'
import { useGradeUnlockStore } from '@/stores/gradeUnlockStore'
import { SettingsDialog } from '@/components/openmaic/settings'
import { apiClient } from '@/services/api'

/* ═══════════════════════════════════════════
   设计 Token — Warm & Playful
   ═══════════════════════════════════════════ */
const T = {
  fontDisplay: "'Baloo 2', 'Quicksand', 'Nunito', sans-serif",
  fontBody: "'Nunito', 'PingFang SC', sans-serif",
  sunOrange: '#FF8C42',
  sunYellow: '#FFD166',
  skyBlue: '#5BC0EB',
  grassGreen: '#2EC4B6',
  violet: '#7C4DFF',
  violetSoft: '#B388FF',
  candyPink: '#FF6B9D',
  cardBg: '#FFFFFF',
  pageBg: '#FFF9F0',
  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  errorRed: '#FF6B6B',
  cardRadius: '24px',
  cardShadow: '0 8px 32px rgba(255, 140, 66, 0.08), 0 2px 8px rgba(0,0,0,0.04)',
}

export function ParentSettings() {
  const navigate = useNavigate()
  const currentChild = useChildStore((s) => s.currentChild)
  const updateChild = useChildStore((s) => s.updateChild)
  const { unlockConfig, updateUnlockConfig } = useGradeUnlockStore()
  const [showAISettings, setShowAISettings] = useState(false)

  // 编辑状态
  const [editingName, setEditingName] = useState(false)
  const [editingAge, setEditingAge] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [ageDraft, setAgeDraft] = useState(0)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [saveMsg, setSaveMsg] = useState('')

  const childName = currentChild?.name ?? '未设置'
  const childAge = currentChild?.age ?? 0

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  /* ── 保存名字 ── */
  const commitName = useCallback(async () => {
    const trimmed = nameDraft.trim()
    if (!trimmed || !currentChild?.id) { setEditingName(false); return }
    setEditingName(false)
    try {
      await apiClient.patch('/children', { name: trimmed }, {
        filters: [{ column: 'id', operator: 'eq', value: Number(currentChild.id) }],
      })
      updateChild(String(currentChild.id), { name: trimmed })
      flash('✅ 名字已更新')
    } catch (err) {
      console.error('[ParentSettings] 保存名字失败:', err)
      flash('❌ 保存失败，请重试')
    }
  }, [nameDraft, currentChild?.id, updateChild])

  /* ── 保存年龄 ── */
  const commitAge = useCallback(async () => {
    if (!currentChild?.id || ageDraft < 1 || ageDraft > 15) { setEditingAge(false); return }
    setEditingAge(false)
    try {
      await apiClient.patch('/children', { age: ageDraft }, {
        filters: [{ column: 'id', operator: 'eq', value: Number(currentChild.id) }],
      })
      updateChild(String(currentChild.id), { age: ageDraft })
      flash('✅ 年龄已更新')
    } catch (err) {
      console.error('[ParentSettings] 保存年龄失败:', err)
      flash('❌ 保存失败，请重试')
    }
  }, [ageDraft, currentChild?.id, updateChild])

  const flash = (msg: string) => {
    setSaveMsg(msg)
    setTimeout(() => setSaveMsg(''), 2500)
  }

  const startEditName = () => { setNameDraft(childName === '未设置' ? '' : childName); setEditingName(true) }
  const startEditAge = () => { setAgeDraft(childAge); setEditingAge(true) }

  /* ── 通用样式 ── */
  const sectionStyle: React.CSSProperties = {
    padding: '22px', borderRadius: T.cardRadius,
    backgroundColor: T.cardBg, boxShadow: T.cardShadow,
    marginBottom: '18px',
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '17px', fontWeight: 'bold', color: T.textDark,
    fontFamily: T.fontDisplay, margin: '0 0 16px',
    display: 'flex', alignItems: 'center', gap: '8px',
  }

  return (
    <div
      data-testid="parent-settings"
      style={{
        minHeight: '100vh',
        background: `linear-gradient(175deg, ${T.pageBg} 0%, #FFF0E6 35%, #FFE8F0 65%, #E8F4FD 100%)`,
        fontFamily: T.fontBody, position: 'relative', overflow: 'hidden',
      }}
    >
      {/* 装饰光斑 */}
      <div style={{
        position: 'absolute', top: '-60px', right: '-40px',
        width: '200px', height: '200px', borderRadius: '50%',
        background: `radial-gradient(circle, ${T.sunYellow}30 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '420px', left: '-80px',
        width: '180px', height: '180px', borderRadius: '50%',
        background: `radial-gradient(circle, ${T.skyBlue}20 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '24px 16px 40px', position: 'relative' }}>

        {/* ═══ 顶部导航 ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            style={{
              width: '44px', height: '44px', borderRadius: '50%',
              border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${T.cardBg}, #FFF5EE)`,
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', color: T.textDark,
            }}
          >
            ←
          </motion.button>
          <div>
            <h1 style={{
              fontSize: '24px', color: T.textDark, margin: 0,
              fontFamily: T.fontDisplay, fontWeight: 'bold',
            }}>
              ⚙️ 高级设置
            </h1>
            <p style={{ fontSize: '12px', color: T.textLight, margin: '2px 0 0' }}>
              管理孩子信息 · 年级解锁 · AI 服务
            </p>
          </div>
        </motion.div>

        {/* 保存反馈 Toast */}
        <AnimatePresence>
          {saveMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 14 }}
              exit={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
              style={{
                padding: '10px 16px', borderRadius: '14px',
                background: saveMsg.startsWith('✅')
                  ? 'linear-gradient(135deg, #C8F7F1, #DEFFF9)'
                  : 'linear-gradient(135deg, #FFE0E0, #FFF0F0)',
                fontSize: '14px', fontWeight: 600, textAlign: 'center',
                color: saveMsg.startsWith('✅') ? T.grassGreen : T.errorRed,
                overflow: 'hidden',
              }}
            >
              {saveMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ 1. 孩子信息（可编辑） ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={sectionStyle}
        >
          <p style={sectionTitleStyle}>
            <span>👶</span> 孩子信息
          </p>

          <div style={{ display: 'flex', gap: '14px' }}>
            {/* 名字卡片 */}
            <div style={{
              flex: 1, padding: '16px', borderRadius: '18px',
              background: 'linear-gradient(135deg, #FFE0C2, #FFECD2)',
              cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* 装饰角标 */}
              <div style={{
                position: 'absolute', top: '8px', right: '8px',
                fontSize: '11px', color: T.sunOrange, opacity: 0.6,
              }}>
                ✏️
              </div>

              <p style={{ fontSize: '12px', color: T.textMedium, margin: '0 0 6px', fontWeight: 600 }}>名字</p>

              {editingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    ref={nameInputRef}
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void commitName()
                      if (e.key === 'Escape') setEditingName(false)
                    }}
                    onBlur={() => void commitName()}
                    maxLength={20}
                    placeholder="输入名字"
                    style={{
                      flex: 1, height: '34px', padding: '0 10px',
                      border: `2px solid ${T.sunOrange}`, borderRadius: '12px',
                      fontSize: '16px', fontWeight: 'bold', color: T.sunOrange,
                      fontFamily: T.fontDisplay, outline: 'none',
                      backgroundColor: '#FFFCF8',
                    }}
                  />
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => void commitName()}
                    style={{
                      width: '34px', height: '34px', borderRadius: '50%',
                      border: 'none', backgroundColor: T.sunOrange, color: '#FFF',
                      cursor: 'pointer', fontSize: '16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ✓
                  </motion.button>
                </div>
              ) : (
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  onClick={startEditName}
                  style={{ cursor: 'pointer' }}
                >
                  <p style={{
                    fontSize: '20px', fontWeight: 'bold', color: T.sunOrange, margin: 0,
                    fontFamily: T.fontDisplay,
                  }}>
                    {childName}
                  </p>
                  <p style={{ fontSize: '11px', color: `${T.sunOrange}88`, margin: '4px 0 0' }}>
                    点击修改
                  </p>
                </motion.div>
              )}
            </div>

            {/* 年龄卡片 */}
            <div style={{
              flex: 1, padding: '16px', borderRadius: '18px',
              background: 'linear-gradient(135deg, #C8E9FA, #E0F2FE)',
              cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '8px', right: '8px',
                fontSize: '11px', color: T.skyBlue, opacity: 0.6,
              }}>
                ✏️
              </div>

              <p style={{ fontSize: '12px', color: T.textMedium, margin: '0 0 6px', fontWeight: 600 }}>年龄</p>

              {editingAge ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setAgeDraft((v) => Math.max(1, v - 1))}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      border: `2px solid ${T.skyBlue}50`, backgroundColor: '#F0F8FF',
                      cursor: 'pointer', fontSize: '18px', color: T.skyBlue,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 'bold',
                    }}
                  >
                    −
                  </motion.button>
                  <span style={{
                    fontSize: '22px', fontWeight: 'bold', color: T.skyBlue,
                    fontFamily: T.fontDisplay, minWidth: '32px', textAlign: 'center',
                  }}>
                    {ageDraft}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setAgeDraft((v) => Math.min(15, v + 1))}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      border: `2px solid ${T.skyBlue}50`, backgroundColor: '#F0F8FF',
                      cursor: 'pointer', fontSize: '18px', color: T.skyBlue,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 'bold',
                    }}
                  >
                    +
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => void commitAge()}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      border: 'none', backgroundColor: T.skyBlue, color: '#FFF',
                      cursor: 'pointer', fontSize: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ✓
                  </motion.button>
                </div>
              ) : (
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  onClick={startEditAge}
                  style={{ cursor: 'pointer' }}
                >
                  <p style={{
                    fontSize: '20px', fontWeight: 'bold', color: T.skyBlue, margin: 0,
                    fontFamily: T.fontDisplay,
                  }}>
                    {childAge}<span style={{ fontSize: '14px', fontWeight: 'normal', color: T.textMedium }}>岁</span>
                  </p>
                  <p style={{ fontSize: '11px', color: `${T.skyBlue}88`, margin: '4px 0 0' }}>
                    点击修改
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.section>

        {/* ═══ 2. 年级解锁条件 ═══ */}
        <motion.section
          data-testid="unlock-config-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={sectionStyle}
        >
          <p style={sectionTitleStyle}>
            <span>🎓</span> 年级解锁条件
          </p>

          {/* 掌握度阈值 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '10px',
            }}>
              <label htmlFor="mastery-threshold" style={{
                fontSize: '14px', color: T.textMedium, fontWeight: 600,
              }}>
                知识点掌握度阈值
              </label>
              <span style={{
                fontSize: '18px', fontWeight: 'bold', color: T.sunOrange,
                fontFamily: T.fontDisplay,
                padding: '2px 12px', borderRadius: '12px',
                background: `${T.sunOrange}12`,
              }}>
                {unlockConfig.masteryThreshold}%
              </span>
            </div>
            <div style={{ position: 'relative', padding: '4px 0' }}>
              <input
                id="mastery-threshold"
                data-testid="mastery-threshold-input"
                type="range" min={50} max={100} step={5}
                value={unlockConfig.masteryThreshold}
                onChange={(e) => updateUnlockConfig({ masteryThreshold: Number(e.target.value) })}
                style={{
                  width: '100%', accentColor: T.sunOrange,
                  height: '8px', borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '11px', color: T.textLight, marginTop: '4px',
              }}>
                <span>50%</span><span>100%</span>
              </div>
            </div>
          </div>

          {/* 最少掌握比例 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '10px',
            }}>
              <label htmlFor="mastered-ratio" style={{
                fontSize: '14px', color: T.textMedium, fontWeight: 600,
              }}>
                最少掌握知识点比例
              </label>
              <span style={{
                fontSize: '18px', fontWeight: 'bold', color: T.grassGreen,
                fontFamily: T.fontDisplay,
                padding: '2px 12px', borderRadius: '12px',
                background: `${T.grassGreen}12`,
              }}>
                {Math.round(unlockConfig.minMasteredRatio * 100)}%
              </span>
            </div>
            <div style={{ position: 'relative', padding: '4px 0' }}>
              <input
                id="mastered-ratio"
                data-testid="mastered-ratio-input"
                type="range" min={50} max={100} step={5}
                value={Math.round(unlockConfig.minMasteredRatio * 100)}
                onChange={(e) => updateUnlockConfig({ minMasteredRatio: Number(e.target.value) / 100 })}
                style={{
                  width: '100%', accentColor: T.grassGreen,
                  height: '8px', borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '11px', color: T.textLight, marginTop: '4px',
              }}>
                <span>50%</span><span>100%</span>
              </div>
            </div>
          </div>

          {/* 解锁说明 */}
          <div style={{
            padding: '14px 16px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #FFF3E7, #FFECD2)',
            fontSize: '13px', color: T.textMedium, lineHeight: 1.6,
          }}>
            💡 当孩子的知识点掌握度 ≥{' '}
            <b style={{ color: T.sunOrange }}>{unlockConfig.masteryThreshold}%</b>{' '}
            的比例达到{' '}
            <b style={{ color: T.grassGreen }}>{Math.round(unlockConfig.minMasteredRatio * 100)}%</b>{' '}
            时，将自动解锁下一年级
          </div>
        </motion.section>

        {/* ═══ 3. AI 服务设置 ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={sectionStyle}
        >
          <p style={sectionTitleStyle}>
            <span>🤖</span> AI 服务设置
          </p>
          <p style={{
            fontSize: '13px', color: T.textLight, margin: '-8px 0 16px', lineHeight: 1.6,
          }}>
            统一配置大模型对话、语音合成(TTS)、语音识别(ASR)、发音评测、图片/视频生成等所有 AI 服务
          </p>

          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(124, 77, 255, 0.15)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAISettings(true)}
            style={{
              width: '100%', padding: '16px', borderRadius: '18px',
              border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${T.violet}, ${T.violetSoft})`,
              color: '#FFFFFF', fontSize: '16px', fontWeight: 'bold',
              fontFamily: T.fontDisplay,
              boxShadow: '0 4px 16px rgba(124, 77, 255, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <span style={{ fontSize: '18px' }}>⚙️</span>
            打开 AI 设置面板
          </motion.button>

          {/* ASR 说明 */}
          <div style={{
            marginTop: '14px', padding: '12px 14px', borderRadius: '14px',
            background: '#F8F4FF', border: '1.5px solid #E8D6FF',
            fontSize: '12px', color: T.textMedium, lineHeight: 1.6,
          }}>
            <b style={{ color: T.violet }}>💡 关于语音识别 (ASR)</b>
            <br />
            默认使用浏览器原生语音识别（免费，无需配置）。如需更高质量，可在面板中切换到 OpenAI Whisper 或通义听悟，需要独立 API Key。
          </div>
        </motion.section>

        {/* OpenMAIC SettingsDialog */}
        <SettingsDialog open={showAISettings} onOpenChange={setShowAISettings} />
      </div>
    </div>
  )
}
