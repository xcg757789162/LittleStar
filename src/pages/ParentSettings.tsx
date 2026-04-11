/**
 * 家长设置管理 — Sunny Playground 风格
 * 每日学习时长、科目偏好、难度调整、孩子信息管理、解锁配置
 * + OpenMAIC 高级 AI 设置面板 (Task 8.6)
 */

import { useState } from 'react'
import { motion } from 'motion/react'
import { useChildStore } from '@/stores/childStore'
import { useAuthStore } from '@/stores/authStore'
import { useGradeUnlockStore } from '@/stores/gradeUnlockStore'
import { SettingsDialog } from '@/components/openmaic/settings'

/* ═══════════════════════════════════════════
   设计 Token
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
  cardRadius: '28px',
  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  textWhite: '#FFFFFF',
  errorRed: '#FF6B6B',
}

const SUBJECT_LABELS: Record<string, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
}

const SUBJECT_COLORS: Record<string, string> = {
  math: T.sunOrange,
  chinese: T.grassGreen,
  english: T.skyBlue,
}

export function ParentSettings() {
  const currentChild = useChildStore((s) => s.currentChild)
  const logout = useAuthStore((s) => s.logout)
  const { unlockConfig, updateUnlockConfig } = useGradeUnlockStore()
  const [showAISettings, setShowAISettings] = useState(false)

  const childName = currentChild?.name ?? '未设置'
  const childAge = currentChild?.age ?? '-'
  const dailyMinutes = currentChild?.settings?.dailyLearningMinutes ?? 30
  const preferredSubjects = currentChild?.settings?.preferredSubjects ?? []

  const sectionStyle: React.CSSProperties = {
    marginBottom: '20px', padding: '20px',
    borderRadius: '22px', backgroundColor: T.cardBg,
    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
  }

  return (
    <div
      data-testid="parent-settings"
      style={{
        padding: '24px', maxWidth: '600px', margin: '0 auto',
        minHeight: '100vh', fontFamily: T.fontBody,
      }}
    >
      <h1 style={{
        fontSize: '26px', color: T.textDark, marginBottom: '24px',
        fontFamily: T.fontDisplay, fontWeight: 'bold',
      }}>
        ⚙️ 设置
      </h1>

      {/* 孩子信息 */}
      <section style={sectionStyle}>
        <h2 style={{
          fontSize: '17px', color: T.textMedium, marginBottom: '14px',
          fontFamily: T.fontDisplay, fontWeight: 600, margin: '0 0 14px',
        }}>
          👶 孩子信息
        </h2>
        <div style={{
          display: 'flex', gap: '16px',
        }}>
          <div style={{
            flex: 1, padding: '14px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #FFE0C2, #FFECD2)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '13px', color: T.textMedium, margin: '0 0 4px' }}>名字</p>
            <p style={{
              fontSize: '18px', fontWeight: 'bold', color: T.sunOrange, margin: 0,
              fontFamily: T.fontDisplay,
            }}>
              {childName}
            </p>
          </div>
          <div style={{
            flex: 1, padding: '14px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #C8E9FA, #E0F2FE)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '13px', color: T.textMedium, margin: '0 0 4px' }}>年龄</p>
            <p style={{
              fontSize: '18px', fontWeight: 'bold', color: T.skyBlue, margin: 0,
              fontFamily: T.fontDisplay,
            }}>
              {childAge}岁
            </p>
          </div>
        </div>
      </section>

      {/* 学习时长 */}
      <section style={sectionStyle}>
        <h2 style={{
          fontSize: '17px', color: T.textMedium, margin: '0 0 14px',
          fontFamily: T.fontDisplay, fontWeight: 600,
        }}>
          ⏰ 每日学习时长
        </h2>
        <div style={{
          padding: '16px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #C8F7F1, #DEFFF9)',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: '28px', fontWeight: 'bold', color: T.grassGreen, margin: 0,
            fontFamily: T.fontDisplay,
          }}>
            {dailyMinutes} <span style={{ fontSize: '14px', fontWeight: 'normal', color: T.textMedium }}>分钟/天</span>
          </p>
        </div>
      </section>

      {/* 科目偏好 */}
      <section style={sectionStyle}>
        <h2 style={{
          fontSize: '17px', color: T.textMedium, margin: '0 0 14px',
          fontFamily: T.fontDisplay, fontWeight: 600,
        }}>
          📚 科目偏好
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {preferredSubjects.map((key) => (
            <span
              key={key}
              style={{
                padding: '8px 18px', borderRadius: '16px',
                backgroundColor: `${SUBJECT_COLORS[key] ?? T.sunOrange}18`,
                border: `2px solid ${SUBJECT_COLORS[key] ?? T.sunOrange}33`,
                fontSize: '14px', color: SUBJECT_COLORS[key] ?? T.sunOrange,
                fontWeight: 'bold', fontFamily: T.fontBody,
              }}
            >
              {SUBJECT_LABELS[key] ?? key}
            </span>
          ))}
          {preferredSubjects.length === 0 && (
            <span style={{ fontSize: '14px', color: T.textLight }}>未设置偏好</span>
          )}
        </div>
      </section>

      {/* 年级解锁配置 */}
      <section data-testid="unlock-config-section" style={sectionStyle}>
        <h2 style={{
          fontSize: '17px', color: T.textMedium, margin: '0 0 14px',
          fontFamily: T.fontDisplay, fontWeight: 600,
        }}>
          🎓 年级解锁条件
        </h2>

        {/* 掌握度阈值 */}
        <div style={{ marginBottom: '18px' }}>
          <label htmlFor="mastery-threshold" style={{
            display: 'block', fontSize: '14px', color: T.textMedium, marginBottom: '8px',
            fontWeight: 600,
          }}>
            知识点掌握度阈值：
            <span style={{ color: T.sunOrange, fontFamily: T.fontDisplay }}>
              {unlockConfig.masteryThreshold}%
            </span>
          </label>
          <input
            id="mastery-threshold" data-testid="mastery-threshold-input"
            type="range" min={50} max={100} step={5}
            value={unlockConfig.masteryThreshold}
            onChange={(e) => updateUnlockConfig({ masteryThreshold: Number(e.target.value) })}
            style={{
              width: '100%', accentColor: T.sunOrange,
              height: '6px', borderRadius: '3px',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: T.textLight }}>
            <span>50%</span><span>100%</span>
          </div>
        </div>

        {/* 最少掌握比例 */}
        <div>
          <label htmlFor="mastered-ratio" style={{
            display: 'block', fontSize: '14px', color: T.textMedium, marginBottom: '8px',
            fontWeight: 600,
          }}>
            最少掌握知识点比例：
            <span style={{ color: T.grassGreen, fontFamily: T.fontDisplay }}>
              {Math.round(unlockConfig.minMasteredRatio * 100)}%
            </span>
          </label>
          <input
            id="mastered-ratio" data-testid="mastered-ratio-input"
            type="range" min={50} max={100} step={5}
            value={Math.round(unlockConfig.minMasteredRatio * 100)}
            onChange={(e) => updateUnlockConfig({ minMasteredRatio: Number(e.target.value) / 100 })}
            style={{
              width: '100%', accentColor: T.grassGreen,
              height: '6px', borderRadius: '3px',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: T.textLight }}>
            <span>50%</span><span>100%</span>
          </div>
        </div>

        <div style={{
          marginTop: '14px', padding: '12px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #FFF3E7, #FFECD2)',
          fontSize: '13px', color: T.textMedium,
        }}>
          💡 当孩子的知识点掌握度 ≥ <b style={{ color: T.sunOrange }}>{unlockConfig.masteryThreshold}%</b> 的比例达到{' '}
          <b style={{ color: T.grassGreen }}>{Math.round(unlockConfig.minMasteredRatio * 100)}%</b> 时，将解锁下一年级
        </div>
      </section>

      {/* AI 课堂高级设置 — OpenMAIC Settings */}
      <section style={sectionStyle}>
        <h2 style={{
          fontSize: '17px', color: T.textMedium, margin: '0 0 14px',
          fontFamily: T.fontDisplay, fontWeight: 600,
        }}>
          🤖 AI 课堂设置
        </h2>
        <p style={{ fontSize: '13px', color: T.textLight, margin: '0 0 14px' }}>
          配置 AI 模型、语音合成、图片/视频生成等高级参数
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAISettings(true)}
          style={{
            width: '100%', padding: '14px', borderRadius: '16px',
            border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #7C4DFF22, #B47CFF22)',
            color: '#7C4DFF', fontSize: '15px', fontWeight: 'bold',
            fontFamily: T.fontDisplay,
          }}
        >
          ⚙️ 打开 AI 设置面板
        </motion.button>
      </section>

      {/* OpenMAIC SettingsDialog */}
      <SettingsDialog open={showAISettings} onOpenChange={setShowAISettings} />

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
          marginBottom: '32px',
        }}
      >
        👋 退出登录
      </motion.button>
    </div>
  )
}
