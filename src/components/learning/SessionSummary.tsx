/**
 * 学习总结组件
 * 包含今日收获、亲子小任务推荐、线下延伸建议、鼓励语、回到首页按钮
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { OfflineExtensionCard } from './OfflineExtensionCard'
import {
  getRandomActivity,
  englishParentActivities,
} from '@/data/seed/english-parent-activities'
import type { ParentActivity } from '@/data/seed/english-parent-activities'
import type { Subject } from '@/types/models'
import type { SessionSummary as SessionSummaryData } from '@/hooks/useLearningFlow'

/** 鼓励语列表 */
const ENCOURAGEMENTS = [
  '你今天真棒！明天继续加油！',
  '小星辰越来越亮了！⭐',
  '每天进步一点点，你是最棒的！',
  '今天学得真好，明天会更精彩！',
  '为你骄傲！继续闪闪发光吧！',
]

/** 明天预告 */
const TOMORROW_PREVIEWS = [
  '明天我们会学更有趣的内容哦！',
  '明天还有新的冒险等着你！',
  '明天见！我已经准备好新的挑战了！',
  '好好休息，明天继续探索知识星球！',
]

export interface SessionSummaryProps {
  /** 会话总结数据 */
  summary: SessionSummaryData
  /** 回到首页 */
  onGoHome: () => void
  /** 当前科目 */
  subject: Subject
  /** 查看学习记录 */
  onViewHistory?: () => void
}

export function SessionSummary({
  summary,
  onGoHome,
  subject,
  onViewHistory,
}: SessionSummaryProps) {
  // 根据正确率计算星星数
  const starCount = useMemo(() => {
    if (summary.accuracy >= 90) return 5
    if (summary.accuracy >= 75) return 4
    if (summary.accuracy >= 60) return 3
    if (summary.accuracy >= 40) return 2
    return 1
  }, [summary.accuracy])

  // 随机鼓励语和明天预告
  const encouragement = useMemo(
    () => ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)],
    [],
  )
  const tomorrowPreview = useMemo(
    () => TOMORROW_PREVIEWS[Math.floor(Math.random() * TOMORROW_PREVIEWS.length)],
    [],
  )

  // 推荐的亲子活动
  const recommendedActivity = useMemo<ParentActivity>(
    () => getRandomActivity(),
    [],
  )

  // 线下延伸建议活动
  const extensionActivities = useMemo<ParentActivity[]>(() => {
    const shuffled = [...englishParentActivities].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 2)
  }, [])

  return (
    <motion.div
      data-testid="session-summary"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        maxWidth: '440px',
        margin: '0 auto',
        padding: '16px',
      }}
    >
      {/* 完成庆祝 */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        style={{
          padding: '32px',
          borderRadius: '28px',
          backgroundColor: 'white',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ fontSize: '60px', display: 'block', marginBottom: '12px' }}
        >
          🎉
        </motion.span>

        <h2
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#333',
            margin: '0 0 8px 0',
          }}
        >
          学习完成！
        </h2>

        <p
          style={{
            fontSize: '16px',
            color: '#7C4DFF',
            fontWeight: '600',
            margin: '0 0 20px 0',
          }}
        >
          {encouragement}
        </p>

        {/* 今日收获 - 星星展示 */}
        <div
          style={{
            marginBottom: '20px',
          }}
        >
          <p
            style={{
              fontSize: '14px',
              color: '#888',
              margin: '0 0 8px 0',
            }}
          >
            今日收获
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, rotate: -180 }}
                animate={{
                  scale: 1,
                  rotate: 0,
                  opacity: i < starCount ? 1 : 0.3,
                }}
                transition={{
                  delay: 0.5 + i * 0.15,
                  type: 'spring',
                  stiffness: 300,
                }}
                style={{
                  fontSize: '36px',
                  filter: i < starCount ? 'none' : 'grayscale(1)',
                }}
              >
                ⭐
              </motion.span>
            ))}
          </div>
        </div>

        {/* 统计数据 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            width: '100%',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#7C4DFF',
              }}
            >
              {summary.questionsCompleted}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>完成题数</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#4CAF50',
              }}
            >
              {summary.accuracy}%
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>正确率</div>
          </div>
        </div>
      </motion.div>

      {/* 亲子小任务推荐 */}
      {subject === 'english' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            width: '100%',
            padding: '24px',
            borderRadius: '20px',
            backgroundColor: '#FFF8E1',
            border: '2px solid #FFD54F',
          }}
        >
          <h4
            style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#F57F17',
            }}
          >
            🎯 亲子小任务
          </h4>
          <p
            style={{
              margin: 0,
              fontSize: '15px',
              color: '#555',
              lineHeight: 1.6,
            }}
          >
            {recommendedActivity.taskDescription}
          </p>
          <div
            style={{
              marginTop: '8px',
              fontSize: '13px',
              color: '#888',
            }}
          >
            ⏰ 约 {recommendedActivity.estimatedMinutes} 分钟
          </div>
        </motion.div>
      )}

      {/* 线下延伸建议 */}
      {subject === 'english' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          style={{ width: '100%' }}
        >
          <OfflineExtensionCard activities={extensionActivities} />
        </motion.div>
      )}

      {/* 明天预告 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        style={{
          padding: '16px 24px',
          borderRadius: '16px',
          backgroundColor: '#E8EAF6',
          fontSize: '15px',
          color: '#3F51B5',
          textAlign: 'center',
          width: '100%',
        }}
      >
        🌟 {tomorrowPreview}
      </motion.div>

      {/* 查看学习记录按钮 */}
      {onViewHistory && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onViewHistory}
          style={{
            padding: '14px 40px',
            borderRadius: '24px',
            border: '2px solid #7C4DFF',
            backgroundColor: 'white',
            color: '#7C4DFF',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          📖 查看学习记录
        </motion.button>
      )}

      {/* 回到首页按钮 */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onGoHome}
        style={{
          padding: '16px 48px',
          borderRadius: '24px',
          border: 'none',
          backgroundColor: '#7C4DFF',
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(124, 77, 255, 0.3)',
        }}
      >
        回到首页
      </motion.button>
    </motion.div>
  )
}
