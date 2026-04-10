/**
 * 每日学习流程页面 — Sunny Playground 风格
 * 整合 OpenMAIC 课堂渲染器，连接自适应引擎和 store
 * 集成庆祝动画、鼓励覆盖层、音效系统
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLearningFlow } from '@/hooks/useLearningFlow'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useAudioActivation } from '@/hooks/useAudioActivation'
import { useClassroomNarration } from '@/hooks/useClassroomNarration'
import { getClassroomAudioService, resetClassroomAudioService } from '@/services/audio/classroom-audio'
import { usePlacementTests } from '@/hooks/queries'
import { useChildStore } from '@/stores/childStore'
import { ClassroomIframe } from '@/components/classroom/ClassroomIframe'
import { SessionSummary } from '@/components/learning/SessionSummary'
import { FeedbackAnimation } from '@/components/feedback/FeedbackAnimation'
import { CelebrationAnimation } from '@/components/feedback/CelebrationAnimation'
import { EncouragementOverlay } from '@/components/feedback/EncouragementOverlay'
import { LessonCard } from '@/components/learning/LessonCard'
import type { CelebrationLevel } from '@/components/feedback/CelebrationAnimation'
import type { Subject } from '@/types/models'
import type { ReLearnMode } from '@/services/review-learning'

/* ═══════════════════════════════════════════
   设计 Token
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
  mathColor: '#FF8C42',
  mathBg: 'linear-gradient(135deg, #FFE0C2 0%, #FFECD2 100%)',
  mathShadow: 'rgba(255, 140, 66, 0.3)',
  chineseColor: '#2EC4B6',
  chineseBg: 'linear-gradient(135deg, #C8F7F1 0%, #DEFFF9 100%)',
  chineseShadow: 'rgba(46, 196, 182, 0.3)',
  englishColor: '#5BC0EB',
  englishBg: 'linear-gradient(135deg, #C8E9FA 0%, #E0F2FE 100%)',
  englishShadow: 'rgba(91, 192, 235, 0.3)',
  cardBg: '#FFFFFF',
  cardRadius: '28px',
  cardShadow: '0 12px 40px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
  btnRadius: '22px',
  textDark: '#2D3142',
  textMedium: '#5E6577',
  textLight: '#9DA3B4',
  textWhite: '#FFFFFF',
}

interface ReviewLocationState {
  reviewMode?: ReLearnMode
  historyId?: string
  knowledgeNodeId?: string
  knowledgeNodeName?: string
  subject?: Subject
}

const SUBJECTS: {
  key: Subject; label: string; emoji: string
  color: string; bg: string; shadow: string
}[] = [
  { key: 'math', label: '数学', emoji: '🔢', color: T.mathColor, bg: T.mathBg, shadow: T.mathShadow },
  { key: 'chinese', label: '语文', emoji: '📖', color: T.chineseColor, bg: T.chineseBg, shadow: T.chineseShadow },
  { key: 'english', label: '英语', emoji: '🔤', color: T.englishColor, bg: T.englishBg, shadow: T.englishShadow },
]

/** 科目星球图标 */
function SubjectPlanet({ emoji, size = 56 }: { emoji: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.55,
      background: 'rgba(255,255,255,0.7)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    }}>
      {emoji}
    </div>
  )
}

export function LearningSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const currentChild = useChildStore((s) => s.currentChild)
  const childId = currentChild?.id
  const gradeLevel = currentChild?.gradeLevel ?? 'middle-kindergarten'

  const { data: placementTests } = usePlacementTests(childId)
  const completedSubjects = useMemo(() => {
    if (!placementTests) return new Set<Subject>()
    return new Set(placementTests.map((t) => t.subject as Subject))
  }, [placementTests])

  const reviewState = useMemo(() => (location.state as ReviewLocationState) ?? {}, [location.state])
  const reviewInitRef = useRef(false)

  const [showCelebration, setShowCelebration] = useState(false)
  const [showEncouragement, setShowEncouragement] = useState(false)
  const [celebrationLevel] = useState<CelebrationLevel>('normal')
  const [showCompleteCelebration, setShowCompleteCelebration] = useState(false)
  const consecutiveCorrectRef = useRef(0)

  const {
    isActive, isLoading, showFeedback, feedbackType,
    isComplete, sessionSummary, encouragement,
    currentClassroom, classroomAnswerCount,
    showLessonPicker, cachedLessons,
    loadCachedLessons, startLesson,
    startReview, stopFlow,
    handleClassroomAnswer, handleClassroomComplete, dismissFeedback,
  } = useLearningFlow()

  const { playLevelUp } = useSoundEffects()
  const { activateAudio } = useAudioActivation()

  // 课堂旁白自动播放（监听 scene-change 事件）
  const { handleSceneChange } = useClassroomNarration({
    classroom: currentClassroom,
    enabled: isActive && !isLoading,
  })

  // TTS 委托回调：iframe 请求宿主代为播放
  const handleTTSRequest = useCallback((data: { text: string; lang?: string }) => {
    const audioService = getClassroomAudioService()
    void audioService.speak(data.text, { lang: data.lang })
  }, [])
  useEffect(() => {
    return () => {
      resetClassroomAudioService()
    }
  }, [])

  useEffect(() => {
    if (
      reviewState.reviewMode && reviewState.knowledgeNodeId &&
      reviewState.subject && !reviewInitRef.current
    ) {
      reviewInitRef.current = true
      void startReview({
        mode: reviewState.reviewMode,
        subject: reviewState.subject,
        historyId: reviewState.historyId,
        knowledgeNodeId: reviewState.knowledgeNodeId,
      })
    }
  }, [reviewState, startReview])

  const handleStart = useCallback(async () => {
    if (selectedSubject) {
      // 在用户点击的同步调用栈中预激活 AudioContext（design.md D2）
      activateAudio()
      consecutiveCorrectRef.current = 0
      await loadCachedLessons(selectedSubject)
    }
  }, [selectedSubject, loadCachedLessons, activateAudio])

  const handleExit = useCallback(() => {
    if (isActive) stopFlow()
    navigate('/')
  }, [isActive, stopFlow, navigate])

  useEffect(() => {
    if (isComplete && sessionSummary) {
      playLevelUp()
      requestAnimationFrame(() => setShowCompleteCelebration(true))
    }
  }, [isComplete, sessionSummary, playLevelUp])

  const handleCelebrationComplete = useCallback(() => setShowCelebration(false), [])
  const handleEncouragementComplete = useCallback(() => setShowEncouragement(false), [])
  const handleCompleteCelebrationDone = useCallback(() => setShowCompleteCelebration(false), [])

  return (
    <div
      data-testid="learning-session"
      style={{
        minHeight: '100vh',
        padding: isActive ? '0' : '24px',
        background: T.bgGradient,
        fontFamily: T.fontBody,
      }}
    >
      {/* 顶部栏 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: isActive ? '0' : '24px',
        padding: isActive ? '8px 12px' : '0',
      }}>
        <div data-testid="session-progress" style={{
          fontSize: '16px', color: T.textMedium,
          fontFamily: T.fontDisplay, fontWeight: 600,
        }}>
          {isActive
            ? showLessonPicker
              ? '📚 选择课程'
              : `🌟 正在学习 ${SUBJECTS.find((s) => s.key === selectedSubject)?.label ?? ''}`
            : isComplete
              ? '🎉 学习完成！'
              : '🌈 选择要学习的科目'}
        </div>
        <motion.button
          data-testid="exit-button"
          whileTap={{ scale: 0.95 }}
          onClick={handleExit}
          style={{
            padding: '8px 18px', borderRadius: '16px',
            border: '2px solid #FFE8D6', backgroundColor: T.cardBg,
            fontSize: '14px', fontFamily: T.fontBody,
            cursor: 'pointer', color: T.textMedium, fontWeight: 600,
          }}
        >
          ← 退出
        </motion.button>
      </div>

      {/* 科目选择 */}
      {!isActive && !isComplete && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
        }}>
          <h2 style={{
            fontSize: '26px', fontWeight: 'bold', color: T.textDark,
            marginBottom: '8px', fontFamily: T.fontDisplay,
          }}>
            今天想学什么？
          </h2>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: '16px', width: '100%', maxWidth: '480px',
          }}>
            {SUBJECTS.map((subject) => {
              const isCompleted = completedSubjects.has(subject.key)
              const isSelected = selectedSubject === subject.key
              return (
                <motion.button
                  key={subject.key}
                  onClick={() => { if (isCompleted) setSelectedSubject(subject.key) }}
                  whileTap={isCompleted ? { scale: 0.93 } : undefined}
                  whileHover={isCompleted ? { scale: 1.05 } : undefined}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '24px 12px', borderRadius: '24px',
                    border: isSelected ? `3px solid ${subject.color}` : '3px solid transparent',
                    background: isCompleted ? subject.bg : '#F5F5F5',
                    cursor: isCompleted ? 'pointer' : 'not-allowed',
                    boxShadow: isSelected ? `0 8px 24px ${subject.shadow}` : 'none',
                    opacity: isCompleted ? 1 : 0.45,
                    position: 'relative',
                    transition: 'box-shadow 0.2s ease',
                  }}
                >
                  <SubjectPlanet emoji={subject.emoji} size={56} />
                  <span style={{
                    fontSize: '18px', fontWeight: 'bold',
                    color: isCompleted ? subject.color : T.textLight,
                    marginTop: '10px', fontFamily: T.fontDisplay,
                  }}>
                    {subject.label}
                  </span>
                  {!isCompleted && (
                    <span style={{
                      fontSize: '11px', color: T.sunOrange, marginTop: '4px',
                      fontWeight: 600, fontFamily: T.fontBody,
                    }}>
                      🔒 未评测
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>

          <motion.button
            onClick={handleStart}
            disabled={!selectedSubject || isLoading}
            whileTap={selectedSubject ? { scale: 0.95 } : undefined}
            whileHover={selectedSubject ? { scale: 1.03 } : undefined}
            style={{
              marginTop: '16px', padding: '18px 52px',
              borderRadius: T.btnRadius, border: 'none',
              background: selectedSubject
                ? `linear-gradient(135deg, ${T.sunOrange} 0%, ${T.candyPink} 100%)`
                : '#E0E0E0',
              color: T.textWhite, fontSize: '22px', fontWeight: 'bold',
              fontFamily: T.fontDisplay,
              cursor: selectedSubject ? 'pointer' : 'default',
              opacity: selectedSubject ? 1 : 0.5,
              boxShadow: selectedSubject
                ? '0 8px 24px rgba(255, 140, 66, 0.35)'
                : 'none',
            }}
          >
            {isLoading ? '⏳ 加载中...' : '🚀 开始学习'}
          </motion.button>
        </div>
      )}

      {/* 学习中 */}
      {isActive && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '0',
        }}>
          {isLoading ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
              padding: '48px',
            }}>
              <motion.span
                style={{ fontSize: '48px' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                🌟
              </motion.span>
              <p style={{ fontSize: '18px', color: T.textMedium, fontFamily: T.fontDisplay }}>
                正在准备课程...
              </p>
            </div>
          ) : showLessonPicker ? (
            /* ═══ 课程选择器视图 ═══ */
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '24px 20px', gap: '24px',
            }}>
              {/* 标题区域 */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center' }}
              >
                <h2 style={{
                  fontSize: '24px', fontWeight: 800, color: T.textDark,
                  fontFamily: T.fontDisplay, margin: '0 0 6px 0',
                }}>
                  📚 今日课程
                </h2>
                <p style={{
                  fontSize: '14px', color: T.textMedium,
                  fontFamily: T.fontBody, margin: 0,
                }}>
                  按顺序完成课程，解锁下一课 ✨
                </p>
              </motion.div>

              {/* 课程卡片网格 */}
              {cachedLessons.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '14px',
                  width: '100%',
                  maxWidth: '720px',
                  justifyItems: 'center',
                }}>
                  {cachedLessons.map((lesson, idx) => (
                    <LessonCard
                      key={`${lesson.knowledgeNodeId}::${lesson.date}`}
                      title={lesson.classroomTitle}
                      thumbnailUrl={lesson.thumbnailUrl}
                      subject={selectedSubject ?? 'english'}
                      isLocked={idx > 0}
                      index={idx}
                      onTap={() => startLesson(lesson.knowledgeNodeId, lesson.date)}
                    />
                  ))}
                </div>
              ) : (
                /* 空缓存提示 */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '16px', padding: '48px 32px',
                    background: T.cardBg, borderRadius: T.cardRadius,
                    boxShadow: T.cardShadow, maxWidth: '400px', width: '100%',
                  }}
                >
                  <span style={{ fontSize: '56px' }}>🌱</span>
                  <p style={{
                    fontSize: '18px', fontWeight: 700, color: T.textDark,
                    fontFamily: T.fontDisplay, textAlign: 'center', margin: 0,
                  }}>
                    课程准备中...
                  </p>
                  <p style={{
                    fontSize: '14px', color: T.textLight,
                    fontFamily: T.fontBody, textAlign: 'center', margin: 0,
                  }}>
                    AI 老师正在为你准备课程，请稍等片刻再试
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => selectedSubject && loadCachedLessons(selectedSubject)}
                      style={{
                        padding: '12px 32px', borderRadius: T.btnRadius, border: 'none',
                        background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
                        color: T.textWhite, fontSize: '16px', fontWeight: 'bold',
                        fontFamily: T.fontDisplay, cursor: 'pointer',
                        boxShadow: '0 6px 20px rgba(255, 140, 66, 0.3)',
                      }}
                    >
                      🔄 重新加载
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleExit}
                      style={{
                        padding: '12px 32px', borderRadius: '18px',
                        border: '2px solid #FFE8D6', backgroundColor: T.cardBg,
                        fontSize: '16px', cursor: 'pointer', color: T.textMedium,
                        fontFamily: T.fontBody,
                      }}
                    >
                      返回首页
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* 返回按钮 */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleExit}
                style={{
                  padding: '10px 28px', borderRadius: '16px',
                  border: '2px solid #FFE8D6', backgroundColor: T.cardBg,
                  fontSize: '14px', cursor: 'pointer', color: T.textMedium,
                  fontFamily: T.fontBody, fontWeight: 600, marginTop: '8px',
                }}
              >
                ← 返回首页
              </motion.button>
            </div>
          ) : currentClassroom ? (
            <ClassroomIframe
              classroom={currentClassroom}
              subject={selectedSubject ?? undefined}
              onComplete={handleClassroomComplete}
              onAnswer={(data) => handleClassroomAnswer({
                selectedIndex: data.selectedAnswer,
                isCorrect: data.isCorrect,
                responseTime: 0,
              })}
              onSceneChange={handleSceneChange}
              onTTSRequest={handleTTSRequest}
              answerCount={classroomAnswerCount}
            />
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '16px', padding: '48px 32px',
            }}>
              {selectedSubject && !completedSubjects.has(selectedSubject) ? (
                <>
                  <span style={{ fontSize: '56px' }}>🔒</span>
                  <p style={{
                    fontSize: '20px', color: T.sunOrange, fontWeight: 600,
                    fontFamily: T.fontDisplay,
                  }}>
                    请先完成能力评测
                  </p>
                  <p style={{
                    fontSize: '14px', color: T.textLight, textAlign: 'center',
                    fontFamily: T.fontBody,
                  }}>
                    完成{SUBJECTS.find(s => s.key === selectedSubject)?.label}评测后，
                    AI 老师才能为你定制课堂
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/placement-test/${selectedSubject}/${gradeLevel}`)}
                    style={{
                      padding: '14px 36px', borderRadius: T.btnRadius, border: 'none',
                      background: `linear-gradient(135deg, ${T.sunOrange}, ${T.sunYellow})`,
                      color: T.textWhite, fontSize: '16px', fontWeight: 'bold',
                      fontFamily: T.fontDisplay, cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(255, 140, 66, 0.3)',
                    }}
                  >
                    🚀 去评测
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExit}
                    style={{
                      marginTop: '4px', padding: '10px 28px',
                      borderRadius: '16px', border: '2px solid #FFE8D6',
                      backgroundColor: T.cardBg, fontSize: '14px',
                      cursor: 'pointer', color: T.textMedium,
                      fontFamily: T.fontBody,
                    }}
                  >
                    返回首页
                  </motion.button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '56px' }}>📚</span>
                  <p style={{ fontSize: '16px', color: T.textLight, fontFamily: T.fontBody }}>
                    暂无课堂数据
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => selectedSubject && loadCachedLessons(selectedSubject)}
                      style={{
                        padding: '12px 32px', borderRadius: T.btnRadius, border: 'none',
                        background: `linear-gradient(135deg, ${T.sunOrange}, ${T.candyPink})`,
                        color: T.textWhite, fontSize: '16px', fontWeight: 'bold',
                        fontFamily: T.fontDisplay, cursor: 'pointer',
                      }}
                    >
                      🔄 重试
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleExit}
                      style={{
                        padding: '12px 32px', borderRadius: '18px',
                        border: '2px solid #FFE8D6', backgroundColor: T.cardBg,
                        fontSize: '16px', cursor: 'pointer', color: T.textMedium,
                        fontFamily: T.fontBody,
                      }}
                    >
                      返回首页
                    </motion.button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 反馈动画 + 鼓励语 */}
      {showFeedback && (
        <div style={{ position: 'relative' }}>
          <FeedbackAnimation type={feedbackType} onComplete={dismissFeedback} />
          {encouragement && (
            <div
              data-testid="encouragement-text"
              style={{
                textAlign: 'center', fontSize: '20px', fontWeight: 'bold',
                fontFamily: T.fontDisplay,
                color: feedbackType === 'correct' ? T.grassGreen : T.sunOrange,
                marginTop: '16px', padding: '12px 24px',
                backgroundColor: feedbackType === 'correct' ? '#E6FAF7' : '#FFF3E7',
                borderRadius: '18px', position: 'fixed',
                bottom: '120px', left: '50%', transform: 'translateX(-50%)',
                zIndex: 100, maxWidth: '80%',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
            >
              {encouragement}
            </div>
          )}
        </div>
      )}

      {/* 庆祝/鼓励动画 */}
      <CelebrationAnimation visible={showCelebration} level={celebrationLevel} onComplete={handleCelebrationComplete} />
      <EncouragementOverlay visible={showEncouragement} onComplete={handleEncouragementComplete} />
      <CelebrationAnimation visible={showCompleteCelebration} level="complete"
        message="学习完成！你太棒了！🎉" onComplete={handleCompleteCelebrationDone} duration={3500} />

      {/* 会话总结 — 复用 SessionSummary 组件 */}
      {isComplete && sessionSummary && !showCompleteCelebration && (
        <SessionSummary
          summary={sessionSummary}
          subject={sessionSummary.subject}
          onGoHome={() => navigate('/')}
          onViewHistory={() => navigate('/history')}
        />
      )}
    </div>
  )
}
