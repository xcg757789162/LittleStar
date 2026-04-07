/**
 * 入学测评页面
 * 测评开始页 + 答题界面 + 进度条 + 简单反馈 + 结果摘要页
 */

import { useState, useMemo, useCallback } from 'react'
import { GRADE_LABELS } from '@/types/grades'
import { loadCurriculum } from '@/curriculum'
import { PlacementTestEngine } from '@/engine/placement-test-engine'
import type { TestSession, TestPlanItem } from '@/engine/placement-test-engine'
import type { GradeLevel, Subject, PlacementResult } from '@/types/models'

const SUBJECT_LABELS: Record<Subject, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
}

type Phase = 'welcome' | 'testing' | 'result'

interface PlacementTestPageProps {
  subject: Subject
  gradeLevel: GradeLevel
  onComplete: (result: PlacementResult) => void
  onExit: () => void
}

export function PlacementTestPage({
  subject,
  gradeLevel,
  onComplete,
  onExit,
}: PlacementTestPageProps) {
  const [phase, setPhase] = useState<Phase>('welcome')
  const [session, setSession] = useState<TestSession | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<TestPlanItem | null>(null)
  const [progress, setProgress] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [result, setResult] = useState<PlacementResult | null>(null)

  const engine = useMemo(() => new PlacementTestEngine(), [])

  const startTest = useCallback(async () => {
    try {
      const curriculum = await loadCurriculum(gradeLevel, subject)
      if (!curriculum) return

      const plan = engine.generateTestPlan(curriculum.modules)
      const newSession = engine.createSession(plan)
      setSession(newSession)
      setCurrentQuestion(engine.getCurrentQuestion(newSession))
      setPhase('testing')
    } catch {
      // 降级：使用空计划
      setPhase('testing')
    }
  }, [engine, gradeLevel, subject])

  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      if (!session) return

      setFeedback(isCorrect ? 'correct' : 'wrong')

      // 短暂显示反馈后进入下一题
      setTimeout(() => {
        const submitResult = engine.submitAnswer(session, isCorrect)
        setProgress(submitResult.progress)
        setFeedback(null)

        if (submitResult.nextQuestion === null) {
          // 测评完成
          const loadCurriculumSync = async () => {
            const curriculum = await loadCurriculum(gradeLevel, subject)
            if (curriculum) {
              const testResult = engine.completeTest(session, curriculum.modules)
              setResult(testResult)
              setPhase('result')
              onComplete(testResult)
            }
          }
          loadCurriculumSync()
        } else {
          setCurrentQuestion(submitResult.nextQuestion)
        }
      }, 600)
    },
    [session, engine, gradeLevel, subject, onComplete],
  )

  const gradeName = GRADE_LABELS[gradeLevel]
  const subjectName = SUBJECT_LABELS[subject]

  return (
    <div
      data-testid="placement-test-page"
      style={{
        padding: '24px',
        maxWidth: '500px',
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 退出按钮 */}
      <button
        data-testid="exit-test-btn"
        onClick={onExit}
        style={{
          alignSelf: 'flex-end',
          padding: '8px 16px',
          fontSize: '14px',
          color: '#999',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        ✕ 退出
      </button>

      {/* 欢迎页 */}
      {phase === 'welcome' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🌟</div>
          <h1 style={{ fontSize: '24px', color: '#333', marginBottom: '8px' }}>
            让我们看看你已经学会了什么！
          </h1>
          <p style={{ fontSize: '16px', color: '#888', marginBottom: '32px' }}>
            {subjectName} · {gradeName}
          </p>
          <p style={{ fontSize: '14px', color: '#999', marginBottom: '32px' }}>
            大约 10-15 道题，5 分钟完成
          </p>
          <button
            data-testid="start-test-btn"
            onClick={startTest}
            style={{
              padding: '16px 48px',
              fontSize: '18px',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#4CAF50',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            🚀 开始测评
          </button>
        </div>
      )}

      {/* 答题界面 */}
      {phase === 'testing' && (
        <div data-testid="test-question-area" style={{ flex: 1 }}>
          {/* 进度条 */}
          <div data-testid="test-progress" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#888', marginBottom: '8px' }}>
              <span>测评进度</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: '8px', backgroundColor: '#E0E0E0', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  backgroundColor: '#4CAF50',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* 反馈提示 */}
          {feedback && (
            <div
              style={{
                textAlign: 'center',
                fontSize: '48px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              {feedback === 'correct' ? '✅' : '❌'}
            </div>
          )}

          {/* 当前题目 */}
          {currentQuestion && !feedback && (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <h2 style={{ fontSize: '20px', color: '#333', marginBottom: '24px' }}>
                {currentQuestion.nodeName}
              </h2>
              <p style={{ fontSize: '14px', color: '#888', marginBottom: '32px' }}>
                模拟测评题 — 请选择
              </p>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button
                  data-testid="answer-correct"
                  onClick={() => handleAnswer(true)}
                  style={{
                    padding: '12px 32px',
                    fontSize: '16px',
                    backgroundColor: '#E8F5E9',
                    border: '2px solid #4CAF50',
                    borderRadius: '12px',
                    cursor: 'pointer',
                  }}
                >
                  我会 ✓
                </button>
                <button
                  data-testid="answer-wrong"
                  onClick={() => handleAnswer(false)}
                  style={{
                    padding: '12px 32px',
                    fontSize: '16px',
                    backgroundColor: '#FBE9E7',
                    border: '2px solid #FF5722',
                    borderRadius: '12px',
                    cursor: 'pointer',
                  }}
                >
                  不太会 ✗
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 结果页 */}
      {phase === 'result' && result && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
          <h1 style={{ fontSize: '24px', color: '#333', marginBottom: '16px' }}>
            测评完成！
          </h1>
          <p style={{ fontSize: '16px', color: '#4CAF50', marginBottom: '8px' }}>
            你已经掌握了 {result.masteredNodes.length} 个知识点，太棒了！
          </p>
          <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>
            综合得分：{result.overallScore}%
          </p>
          <button
            onClick={() => onComplete(result)}
            style={{
              padding: '14px 48px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#4CAF50',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            开始学习 🚀
          </button>
        </div>
      )}
    </div>
  )
}
