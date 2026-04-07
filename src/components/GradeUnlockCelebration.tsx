/**
 * 年级解锁庆祝动画组件
 * 显示解锁通知、庆祝动画、跳转入学测评按钮
 */

import type { PendingUnlock } from '@/stores/gradeUnlockStore'
import { GRADE_LABELS } from '@/types/grades'
import type { Subject } from '@/types/models'

/** 科目中文标签映射 */
const SUBJECT_LABELS: Record<Subject, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
}

interface GradeUnlockCelebrationProps {
  /** 待处理解锁信息 */
  pending: PendingUnlock
  /** 点击"开始测评"回调 */
  onConfirm: () => void
  /** 点击"稍后再说"回调 */
  onDismiss: () => void
}

export function GradeUnlockCelebration({
  pending,
  onConfirm,
  onDismiss,
}: GradeUnlockCelebrationProps) {
  const gradeName = GRADE_LABELS[pending.nextGrade]
  const subjectName = SUBJECT_LABELS[pending.subject]

  return (
    <div
      data-testid="grade-unlock-celebration"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '24px',
          padding: '32px',
          maxWidth: '360px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* 庆祝图标 */}
        <div
          data-testid="celebration-icon"
          style={{
            fontSize: '64px',
            marginBottom: '16px',
            animation: 'bounce 0.6s ease-in-out infinite alternate',
          }}
        >
          🎉
        </div>

        {/* 标题 */}
        <h2
          style={{
            fontSize: '22px',
            color: '#333',
            marginBottom: '8px',
            fontWeight: 700,
          }}
        >
          恭喜解锁新年级！
        </h2>

        {/* 年级 + 科目信息 */}
        <p
          style={{
            fontSize: '18px',
            color: '#FF6B35',
            marginBottom: '8px',
            fontWeight: 600,
          }}
        >
          {subjectName} · {gradeName}
        </p>

        {/* 掌握度信息 */}
        <p
          style={{
            fontSize: '14px',
            color: '#888',
            marginBottom: '24px',
          }}
        >
          当前平均掌握度：{Math.round(pending.averageMastery)}%
        </p>

        {/* 开始测评按钮 */}
        <button
          data-testid="start-placement-btn"
          onClick={onConfirm}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '16px',
            fontWeight: 600,
            color: '#fff',
            backgroundColor: '#FF6B35',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            marginBottom: '12px',
          }}
        >
          🚀 开始入学测评
        </button>

        {/* 稍后再说按钮 */}
        <button
          data-testid="dismiss-btn"
          onClick={onDismiss}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            color: '#999',
            backgroundColor: 'transparent',
            border: '1px solid #E0E0E0',
            borderRadius: '12px',
            cursor: 'pointer',
          }}
        >
          稍后再说
        </button>
      </div>
    </div>
  )
}
