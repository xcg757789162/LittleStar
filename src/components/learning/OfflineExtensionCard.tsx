/**
 * 线下延伸建议组件
 * 学习结束时展示，告诉家长如何在日常生活中巩固学习内容
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ParentActivity } from '@/data/seed/english-parent-activities'

export interface OfflineExtensionCardProps {
  /** 推荐的亲子活动列表 */
  activities: ParentActivity[]
}

export function OfflineExtensionCard({ activities }: OfflineExtensionCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (activities.length === 0) return null

  return (
    <motion.div
      data-testid="offline-extension-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        width: '100%',
        maxWidth: '420px',
        margin: '0 auto',
        padding: '24px',
        borderRadius: '20px',
        backgroundColor: '#F5F5F5',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* 标题 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <span style={{ fontSize: '24px' }}>📝</span>
        <h4
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          课后延伸建议
        </h4>
        <span
          style={{
            fontSize: '12px',
            color: '#999',
            marginLeft: 'auto',
          }}
        >
          给爸爸妈妈
        </span>
      </div>

      {/* 活动列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activities.map((activity) => {
          const isExpanded = expandedId === activity.id

          return (
            <motion.div
              key={activity.id}
              layout
              style={{
                padding: '16px',
                borderRadius: '14px',
                backgroundColor: 'white',
                cursor: 'pointer',
                border: isExpanded
                  ? '2px solid #7C4DFF'
                  : '2px solid transparent',
              }}
              onClick={() =>
                setExpandedId(isExpanded ? null : activity.id)
              }
            >
              {/* 标题行 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '20px' }}>
                  {activity.type === 'sing'
                    ? '🎵'
                    : activity.type === 'find'
                      ? '🔍'
                      : activity.type === 'play'
                        ? '🎮'
                        : activity.type === 'draw'
                          ? '🎨'
                          : '💬'}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#333',
                    lineHeight: 1.4,
                  }}
                >
                  {activity.offlineExtension.slice(0, 40)}
                  {activity.offlineExtension.length > 40 ? '...' : ''}
                </span>
                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ fontSize: '16px', color: '#999' }}
                >
                  ▼
                </motion.span>
              </div>

              {/* 展开内容 */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div
                      style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid #EEE',
                      }}
                    >
                      {/* 延伸建议完整内容 */}
                      <p
                        style={{
                          fontSize: '14px',
                          color: '#555',
                          lineHeight: 1.6,
                          margin: '0 0 12px 0',
                        }}
                      >
                        {activity.offlineExtension}
                      </p>

                      {/* 家长指导 */}
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          backgroundColor: '#F3E5F5',
                          fontSize: '13px',
                          color: '#6A1B9A',
                          lineHeight: 1.5,
                        }}
                      >
                        💡 {activity.guidanceCard}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
