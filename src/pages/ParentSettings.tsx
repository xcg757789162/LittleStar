/**
 * 家长设置管理
 * 每日学习时长、科目偏好、难度调整、孩子信息管理、解锁配置
 */

import { useChildStore } from '@/stores/childStore'
import { useAuthStore } from '@/stores/authStore'
import { useGradeUnlockStore } from '@/stores/gradeUnlockStore'

/** 科目 key → 中文显示名映射 */
const SUBJECT_LABELS: Record<string, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
}

export function ParentSettings() {
  const currentChild = useChildStore((s) => s.currentChild)
  const logout = useAuthStore((s) => s.logout)
  const { unlockConfig, updateUnlockConfig } = useGradeUnlockStore()

  const childName = currentChild?.name ?? '未设置'
  const childAge = currentChild?.age ?? '-'
  const dailyMinutes = currentChild?.settings?.dailyLearningMinutes ?? 30
  const preferredSubjects = currentChild?.settings?.preferredSubjects ?? []

  return (
    <div
      data-testid="parent-settings"
      style={{
        padding: '24px',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: '24px', color: '#333', marginBottom: '24px' }}>设置</h1>

      {/* 孩子信息 */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', color: '#555', marginBottom: '12px' }}>孩子信息</h2>
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#F5F5F5',
          }}
        >
          <p>名字：{childName}</p>
          <p>年龄：{childAge}岁</p>
        </div>
      </section>

      {/* 学习时长 */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', color: '#555', marginBottom: '12px' }}>每日学习时长</h2>
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#E3F2FD',
          }}
        >
          <p>当前设置：{dailyMinutes} 分钟/天</p>
        </div>
      </section>

      {/* 科目偏好 */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', color: '#555', marginBottom: '12px' }}>科目偏好</h2>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {preferredSubjects.map((key) => (
            <span
              key={key}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor: '#E8F5E9',
                fontSize: '14px',
              }}
            >
              {SUBJECT_LABELS[key] ?? key}
            </span>
          ))}
        </div>
      </section>

      {/* 年级解锁配置 */}
      <section data-testid="unlock-config-section" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', color: '#555', marginBottom: '12px' }}>年级解锁条件</h2>
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#FFF3E0',
          }}
        >
          {/* 掌握度阈值 */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="mastery-threshold"
              style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}
            >
              知识点掌握度阈值：{unlockConfig.masteryThreshold}%
            </label>
            <input
              id="mastery-threshold"
              data-testid="mastery-threshold-input"
              type="range"
              min={50}
              max={100}
              step={5}
              value={unlockConfig.masteryThreshold}
              onChange={(e) =>
                updateUnlockConfig({ masteryThreshold: Number(e.target.value) })
              }
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999' }}>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* 最少掌握比例 */}
          <div>
            <label
              htmlFor="mastered-ratio"
              style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}
            >
              最少掌握知识点比例：{Math.round(unlockConfig.minMasteredRatio * 100)}%
            </label>
            <input
              id="mastered-ratio"
              data-testid="mastered-ratio-input"
              type="range"
              min={50}
              max={100}
              step={5}
              value={Math.round(unlockConfig.minMasteredRatio * 100)}
              onChange={(e) =>
                updateUnlockConfig({ minMasteredRatio: Number(e.target.value) / 100 })
              }
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999' }}>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: '#888', marginTop: '12px' }}>
            💡 当孩子的知识点掌握度 ≥ {unlockConfig.masteryThreshold}% 的比例达到{' '}
            {Math.round(unlockConfig.minMasteredRatio * 100)}% 时，将解锁下一年级
          </p>
        </div>
      </section>

      {/* 退出登录 */}
      <button
        data-testid="logout-btn"
        onClick={() => {
          if (window.confirm('确定要退出登录吗？')) {
            logout()
          }
        }}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          border: '1px solid #FFCDD2',
          backgroundColor: '#fff',
          color: '#D32F2F',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginBottom: '32px',
        }}
      >
        退出登录
      </button>
    </div>
  )
}
