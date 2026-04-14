/**
 * GenerationPreview — 课程生成预览页
 *
 * 路由: /preview
 *
 * 功能:
 *   1. 展示 Pipeline 实时生成进度（大纲→内容→动作→TTS→组装）
 *   2. 展示已缓存课程列表（可直接进入课堂）
 *   3. 手动触发预生成
 *   4. 进入课堂（选择课程 → /classroom）
 *
 * 数据流:
 *   usePreGeneration (Pipeline 进度) + ClassroomCache (缓存列表)
 *   → 用户选择 → navigate('/classroom', { state })
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useChildStore } from '@/stores/childStore'
import { usePlacementTests } from '@/hooks/queries'
import { usePreGeneration, type PreGenerationStatus } from '@/hooks/usePreGeneration'
import { ClassroomCache, type CacheListItem } from '@/services/openmaic/cache'
import { PostgresCacheStore } from '@/services/openmaic/postgres-cache-store'
import type { PipelineStepName } from '@/services/openmaic/pipeline-types'
import { ThumbnailSlide } from '@/components/openmaic/slide-renderer/components/ThumbnailSlide'

/* ═══════════════════════════════════════════
   设计 Token — Sunny Playground 风格
   ═══════════════════════════════════════════ */
const T = {
  fontDisplay: "'Baloo 2', 'Nunito', sans-serif",
  fontBody: "'Nunito', 'PingFang SC', sans-serif",
  bgGradient: 'linear-gradient(170deg, #FFF8E7 0%, #FFE8D6 30%, #FFDEE9 60%, #D4F1F9 100%)',
  sunOrange: '#FF8C42',
  sunYellow: '#FFD166',
  skyBlue: '#5BC0EB',
  grassGreen: '#2EC4B6',
  candyPink: '#FF6B9D',
  starGold: '#FFC845',
  lavender: '#7C4DFF',
  cardBg: '#FFFFFF',
  cardRadius: '24px',
  cardShadow: '0 12px 40px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
  btnRadius: '22px',
  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  textWhite: '#FFFFFF',
  successGreen: '#2EC4B6',
  errorRed: '#FF6B6B',
}

/** Pipeline 步骤 → 中文标签 + 图标 */
const STEP_META: Record<PipelineStepName, { label: string; emoji: string }> = {
  'agent-profiles': { label: '角色生成', emoji: '🎭' },
  'outlines': { label: '大纲规划', emoji: '📋' },
  'scene-content': { label: '场景内容', emoji: '🎨' },
  'scene-actions': { label: '教学动作', emoji: '🎬' },
  'tts': { label: '语音合成', emoji: '🔊' },
  'assembly': { label: '课堂组装', emoji: '🏗️' },
}

const PIPELINE_STEPS: PipelineStepName[] = [
  'agent-profiles', 'outlines', 'scene-content', 'scene-actions', 'tts', 'assembly',
]

/** 状态 → 展示信息 */
const STATUS_META: Record<PreGenerationStatus, { label: string; emoji: string; color: string }> = {
  idle: { label: '等待中', emoji: '😴', color: T.textLight },
  checking: { label: '检查中…', emoji: '🔍', color: T.skyBlue },
  generating: { label: '生成中…', emoji: '✨', color: T.lavender },
  completed: { label: '已就绪', emoji: '🎉', color: T.successGreen },
  failed: { label: '生成失败', emoji: '😢', color: T.errorRed },
  'api-key-missing': { label: '需要配置', emoji: '🔑', color: T.sunOrange },
}

/** 科目颜色 */
const SUBJECT_COLORS: Record<string, { color: string; bg: string; emoji: string }> = {
  math: { color: '#FF8C42', bg: 'linear-gradient(135deg, #FFE0C2, #FFECD2)', emoji: '🔢' },
  chinese: { color: '#2EC4B6', bg: 'linear-gradient(135deg, #C8F7F1, #DEFFF9)', emoji: '📖' },
  english: { color: '#5BC0EB', bg: 'linear-gradient(135deg, #C8E9FA, #E0F2FE)', emoji: '🔤' },
}

export function GenerationPreview() {
  const navigate = useNavigate()
  const currentChild = useChildStore((s) => s.currentChild)
  const { data: tests } = usePlacementTests(currentChild?.id)
  const hasPlacement = tests && tests.length > 0
  const completedSubjectCount = useMemo(
    () => new Set((tests ?? []).map((t) => t.subject)).size,
    [tests],
  )

  // 缓存列表
  const [cacheList, setCacheList] = useState<CacheListItem[]>([])
  const [cacheLoading, setCacheLoading] = useState(true)
  const [cachedCount, setCachedCount] = useState(0)

  // 加载缓存列表
  const loadCacheList = useCallback(async () => {
    if (!currentChild?.id) return
    setCacheLoading(true)
    try {
      const cache = new ClassroomCache(new PostgresCacheStore(Number(currentChild.id)))
      const list = await cache.listCachedClassrooms()
      setCacheList(list)
      setCachedCount(list.length)
    } catch (err) {
      console.warn('[GenerationPreview] 加载缓存列表失败:', err)
    } finally {
      setCacheLoading(false)
    }
  }, [currentChild?.id])

  useEffect(() => { loadCacheList() }, [loadCacheList])

  // 预生成 Hook
  const preGen = usePreGeneration(currentChild?.id, hasPlacement ?? null, cachedCount, completedSubjectCount)

  // 预生成完成后刷新缓存列表
  useEffect(() => {
    if (preGen.status === 'completed') {
      loadCacheList()
    }
  }, [preGen.status, loadCacheList])

  // 选择课程进入课堂
  const handleSelectLesson = useCallback(async (item: CacheListItem) => {
    if (!currentChild?.id) return
    try {
      const cache = new ClassroomCache(new PostgresCacheStore(Number(currentChild.id)))
      const classroom = await cache.getClassroom(item.knowledgeNodeId, item.lessonIndex, item.date)
      if (classroom) {
        navigate('/classroom', {
          state: {
            classroomJson: classroom,
            knowledgeNodeId: item.knowledgeNodeId,
            subject: item.subject,
          },
        })
      }
    } catch (err) {
      console.error('[GenerationPreview] 加载课程失败:', err)
    }
  }, [currentChild?.id, navigate])

  // 按科目分组缓存列表
  const groupedLessons = useMemo(() => {
    const groups: Record<string, CacheListItem[]> = {}
    for (const item of cacheList) {
      const key = item.subject ?? 'other'
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }
    return groups
  }, [cacheList])

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bgGradient,
      fontFamily: T.fontBody,
      padding: '24px 16px 80px',
    }}>
      {/* 顶部标题 */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '28px' }}
        >
          <h1 style={{
            fontSize: '28px',
            fontFamily: T.fontDisplay,
            fontWeight: 'bold',
            color: T.textDark,
            margin: '0 0 8px',
          }}>
            ✨ 课程工坊
          </h1>
          <p style={{ fontSize: '15px', color: T.textMedium, margin: 0 }}>
            AI 正在为 {currentChild?.name ?? '小朋友'} 准备精彩课程
          </p>
        </motion.div>

        {/* ═══ Pipeline 生成进度卡片 ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: T.cardBg,
            borderRadius: T.cardRadius,
            boxShadow: T.cardShadow,
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          {/* 状态头部 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '28px' }}>{STATUS_META[preGen.status].emoji}</span>
              <div>
                <p style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 'bold',
                  fontFamily: T.fontDisplay,
                  color: STATUS_META[preGen.status].color,
                }}>
                  {STATUS_META[preGen.status].label}
                </p>
                {preGen.stageText && (
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: T.textMedium }}>
                    {preGen.stageText}
                  </p>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {(preGen.status === 'idle' || preGen.status === 'failed' || preGen.status === 'completed') && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={preGen.triggerGeneration}
                  style={{
                    padding: '10px 20px',
                    borderRadius: T.btnRadius,
                    border: 'none',
                    background: `linear-gradient(135deg, ${T.lavender}, ${T.candyPink})`,
                    color: T.textWhite,
                    fontSize: '14px',
                    fontWeight: 'bold',
                    fontFamily: T.fontDisplay,
                    cursor: 'pointer',
                  }}
                >
                  {preGen.status === 'completed' ? '🔄 再次生成' : '🚀 开始生成'}
                </motion.button>
              )}
              {preGen.status === 'api-key-missing' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/parent')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: T.btnRadius,
                    border: 'none',
                    background: `linear-gradient(135deg, ${T.sunOrange}, ${T.sunYellow})`,
                    color: T.textWhite,
                    fontSize: '14px',
                    fontWeight: 'bold',
                    fontFamily: T.fontDisplay,
                    cursor: 'pointer',
                  }}
                >
                  🔑 前往配置
                </motion.button>
              )}
            </div>
          </div>

          {/* Pipeline 步骤进度条 */}
          {preGen.status === 'generating' && preGen.generationStep && (
            <div>
              {/* 总进度条 */}
              <div style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: '#F0F0F5',
                marginBottom: '16px',
                overflow: 'hidden',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${preGen.generationProgress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    borderRadius: '4px',
                    background: `linear-gradient(90deg, ${T.lavender}, ${T.candyPink})`,
                  }}
                />
              </div>

              {/* 步骤标签 */}
              <div style={{
                display: 'flex',
                gap: '4px',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}>
                {PIPELINE_STEPS.map((step) => {
                  const currentIdx = PIPELINE_STEPS.indexOf(preGen.generationStep!)
                  const stepIdx = PIPELINE_STEPS.indexOf(step)
                  const isActive = stepIdx === currentIdx
                  const isDone = stepIdx < currentIdx
                  const meta = STEP_META[step]

                  return (
                    <div
                      key={step}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        flex: '1 1 0',
                        minWidth: '60px',
                      }}
                    >
                      <span style={{
                        fontSize: '20px',
                        opacity: isDone ? 1 : isActive ? 1 : 0.3,
                        filter: isDone ? 'none' : isActive ? 'none' : 'grayscale(1)',
                      }}>
                        {isDone ? '✅' : meta.emoji}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: isActive ? 'bold' : 'normal',
                        color: isActive ? T.lavender : isDone ? T.successGreen : T.textLight,
                        textAlign: 'center',
                      }}>
                        {meta.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* 场景进度 */}
              {preGen.currentSceneIndex > 0 && (
                <p style={{
                  marginTop: '12px',
                  fontSize: '13px',
                  color: T.textMedium,
                  textAlign: 'center',
                }}>
                  场景 {preGen.currentSceneIndex + 1} / ?
                </p>
              )}
            </div>
          )}

          {/* 生成中的任务统计 */}
          {preGen.status === 'generating' && preGen.totalCount > 0 && (
            <div style={{
              marginTop: '16px',
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
            }}>
              <StatBadge label="总计" value={preGen.totalCount} color={T.textMedium} />
              <StatBadge label="完成" value={preGen.completedCount} color={T.successGreen} />
              <StatBadge label="进行中" value={preGen.pendingCount} color={T.lavender} />
            </div>
          )}

          {/* 错误信息 */}
          {preGen.error && (
            <div style={{
              marginTop: '12px',
              padding: '12px 16px',
              borderRadius: '14px',
              background: '#FFF0F0',
              border: '1px solid #FFD4D4',
              fontSize: '13px',
              color: T.errorRed,
            }}>
              ⚠️ {preGen.error}
            </div>
          )}
        </motion.div>

        {/* ═══ 缓存课程列表 ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            <h2 style={{
              fontSize: '20px',
              fontFamily: T.fontDisplay,
              fontWeight: 'bold',
              color: T.textDark,
              margin: 0,
            }}>
              📚 已准备好的课程
            </h2>
            <span style={{
              fontSize: '14px',
              color: T.textMedium,
              background: `${T.lavender}15`,
              padding: '4px 12px',
              borderRadius: '12px',
            }}>
              {cacheList.length} 节
            </span>
          </div>

          {cacheLoading ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 0',
              color: T.textMedium,
              fontSize: '15px',
            }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                style={{ display: 'inline-block', fontSize: '28px', marginBottom: '8px' }}
              >
                ⏳
              </motion.div>
              <p style={{ margin: 0 }}>加载中…</p>
            </div>
          ) : cacheList.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 20px',
              background: T.cardBg,
              borderRadius: T.cardRadius,
              boxShadow: T.cardShadow,
            }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>🌟</span>
              <p style={{
                fontSize: '16px',
                color: T.textMedium,
                fontFamily: T.fontDisplay,
                margin: '0 0 16px',
              }}>
                还没有准备好的课程
              </p>
              <p style={{ fontSize: '13px', color: T.textLight, margin: 0 }}>
                {hasPlacement
                  ? '点击上方「开始生成」按钮，AI 将为你准备课程'
                  : '请先完成学科评测，AI 将根据评测结果定制课程'}
              </p>
              {!hasPlacement && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/placement-test-select')}
                  style={{
                    marginTop: '16px',
                    padding: '12px 28px',
                    borderRadius: T.btnRadius,
                    border: 'none',
                    background: `linear-gradient(135deg, ${T.skyBlue}, ${T.grassGreen})`,
                    color: T.textWhite,
                    fontSize: '15px',
                    fontWeight: 'bold',
                    fontFamily: T.fontDisplay,
                    cursor: 'pointer',
                  }}
                >
                  📝 去评测
                </motion.button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(groupedLessons).map(([subjectKey, items]) => {
                const subjectMeta = SUBJECT_COLORS[subjectKey] ?? {
                  color: T.lavender,
                  bg: `linear-gradient(135deg, #E8E0FF, #F0EAFF)`,
                  emoji: '📄',
                }

                return (
                  <div key={subjectKey}>
                    {/* 科目分组标题 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px',
                    }}>
                      <span style={{ fontSize: '18px' }}>{subjectMeta.emoji}</span>
                      <span style={{
                        fontSize: '15px',
                        fontWeight: 'bold',
                        fontFamily: T.fontDisplay,
                        color: subjectMeta.color,
                      }}>
                        {subjectKey === 'math' ? '数学' :
                         subjectKey === 'chinese' ? '语文' :
                         subjectKey === 'english' ? '英语' : '其他'}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        color: T.textLight,
                        background: `${subjectMeta.color}15`,
                        padding: '2px 8px',
                        borderRadius: '8px',
                      }}>
                        {items.length} 节
                      </span>
                    </div>

                    {/* 课程卡片 */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: '12px',
                    }}>
                      {items.map((item, idx) => (
                        <LessonPreviewCard
                          key={`${item.knowledgeNodeId}-${item.date}`}
                          item={item}
                          index={idx}
                          subjectColor={subjectMeta.color}
                          subjectBg={subjectMeta.bg}
                          onSelect={() => handleSelectLesson(item)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* 返回首页 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ textAlign: 'center', marginTop: '32px' }}
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            style={{
              padding: '12px 32px',
              borderRadius: T.btnRadius,
              border: `2px solid ${T.textLight}40`,
              background: 'transparent',
              color: T.textMedium,
              fontSize: '14px',
              fontFamily: T.fontDisplay,
              cursor: 'pointer',
            }}
          >
            ← 返回星辰乐园
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   子组件
   ═══════════════════════════════════════════ */

/** 统计徽章 */
function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{
        margin: 0,
        fontSize: '22px',
        fontWeight: 'bold',
        fontFamily: "'Baloo 2', sans-serif",
        color,
      }}>
        {value}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9DA3B4' }}>{label}</p>
    </div>
  )
}

/** 课程预览卡片 */
function LessonPreviewCard({
  item,
  index,
  subjectColor,
  subjectBg,
  onSelect,
}: {
  item: CacheListItem
  index: number
  subjectColor: string
  subjectBg: string
  onSelect: () => void
}) {
  const thumbRef = useRef<HTMLDivElement>(null)
  const [thumbWidth, setThumbWidth] = useState(0)

  // 获取缩略图区域实际宽度
  useEffect(() => {
    if (!item.firstSlideCanvas || !thumbRef.current) return
    const el = thumbRef.current
    const update = () => setThumbWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [item.firstSlideCanvas])

  const showSlide = !!item.firstSlideCanvas && thumbWidth > 0

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        background: T.cardBg,
        borderRadius: '20px',
        boxShadow: T.cardShadow,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* 缩略图区域 */}
      <div ref={thumbRef} style={{
        height: '100px',
        background: showSlide ? '#FFFFFF' : subjectBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {showSlide ? (
          <ThumbnailSlide
            slide={item.firstSlideCanvas!}
            size={thumbWidth}
            viewportSize={item.firstSlideCanvas!.viewportSize ?? 1000}
            viewportRatio={item.firstSlideCanvas!.viewportRatio ?? 0.5625}
          />
        ) : item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.classroomTitle}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <span style={{ fontSize: '40px', opacity: 0.6 }}>
            {SUBJECT_COLORS[item.subject ?? '']?.emoji ?? '📄'}
          </span>
        )}
        {/* 序号标签 */}
        <span style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: subjectColor,
          color: '#fff',
          fontSize: '14px',
          fontWeight: 'bold',
          fontFamily: "'Baloo 2', sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {index + 1}
        </span>
      </div>

      {/* 课程信息 */}
      <div style={{ padding: '12px 14px' }}>
        <p style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: 'bold',
          fontFamily: "'Baloo 2', 'Nunito', sans-serif",
          color: T.textDark,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.classroomTitle || `课程 ${index + 1}`}
        </p>
        <p style={{
          margin: '4px 0 0',
          fontSize: '12px',
          color: T.textLight,
        }}>
          {new Date(item.cachedAt).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </motion.div>
  )
}
