/**
 * 纠音练习页面组件
 * 整合所有子组件 + PronunciationCoordinator 状态驱动 UI
 */

import { motion } from 'framer-motion'
import { VoiceRecorder } from './VoiceRecorder'
import { SyllableHighlight } from './SyllableHighlight'
import { PronunciationFeedback } from './PronunciationFeedback'

/** 练习阶段 */
export type DrillPhase = 'idle' | 'listening' | 'recording' | 'assessing' | 'feedback' | 'retry' | 'drilling'

export interface PronunciationDrillProps {
  /** 当前练习单词 */
  word: string
  /** 当前阶段 */
  phase: DrillPhase
  /** 星级评分 */
  stars: number
  /** 反馈文本 */
  feedbackText: string
  /** 是否通过 */
  passed: boolean
  /** 音节列表 */
  syllables: string[]
  /** 当前音节索引 */
  currentSyllableIndex: number
  /** 是否正在录音 */
  isRecording: boolean
  /** 开始示范 */
  onDemonstrate: () => void
  /** 开始录音 */
  onRecord: () => void
  /** 重试 */
  onRetry: () => void
  /** 分音节练习 */
  onDrill: () => void
  /** 继续 */
  onContinue: () => void
  /** 播放反馈 */
  onPlayFeedback: () => void
}

export function PronunciationDrill({
  word,
  phase,
  stars,
  feedbackText,
  passed,
  syllables,
  currentSyllableIndex,
  isRecording,
  onDemonstrate,
  onRecord,
  onRetry,
  onDrill,
  onContinue,
  onPlayFeedback,
}: PronunciationDrillProps) {
  return (
    <div
      data-testid="pronunciation-drill"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        padding: '24px',
        minHeight: '400px',
      }}
    >
      {/* 单词展示 */}
      <motion.div
        data-testid="drill-word"
        animate={{ scale: phase === 'listening' ? [1, 1.05, 1] : 1 }}
        transition={{ repeat: phase === 'listening' ? Infinity : 0, duration: 2 }}
        style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#1565C0',
          textAlign: 'center',
          padding: '16px',
        }}
      >
        {word}
      </motion.div>

      {/* 根据阶段渲染不同内容 */}
      {phase === 'idle' && (
        <motion.button
          data-testid="btn-start"
          onClick={onDemonstrate}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '16px 48px',
            borderRadius: '32px',
            border: 'none',
            backgroundColor: '#2196F3',
            color: 'white',
            fontSize: '20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(33, 150, 243, 0.3)',
          }}
        >
          开始学习 🎵
        </motion.button>
      )}

      {(phase === 'listening' || phase === 'recording') && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <p style={{ fontSize: '18px', color: '#616161' }}>
            {phase === 'listening' ? '听完后，按住麦克风跟着说～' : '正在听你说...'}
          </p>
          <VoiceRecorder
            onRecord={onRecord}
            isRecording={isRecording}
          />
        </div>
      )}

      {phase === 'assessing' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            style={{ fontSize: '40px' }}
          >
            ⏳
          </motion.div>
          <p style={{ fontSize: '16px', color: '#9E9E9E' }}>正在评分中...</p>
        </div>
      )}

      {phase === 'feedback' && (
        <PronunciationFeedback
          stars={stars}
          feedbackText={feedbackText}
          passed={passed}
          onRetry={onRetry}
          onContinue={onContinue}
          onPlayFeedback={onPlayFeedback}
        />
      )}

      {phase === 'retry' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <p style={{ fontSize: '18px', color: '#F57C00' }}>
            再听一遍，慢慢来～
          </p>
          <motion.button
            data-testid="btn-retry"
            onClick={onRetry}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '12px 32px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: '#FF9800',
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            再试一次 🔄
          </motion.button>
        </div>
      )}

      {phase === 'drilling' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <p style={{ fontSize: '18px', color: '#7B1FA2' }}>
            我们来拆开练习每个音节吧！
          </p>
          <SyllableHighlight
            syllables={syllables}
            currentIndex={currentSyllableIndex}
          />
          <motion.button
            data-testid="btn-drill"
            onClick={onDrill}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '12px 32px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: '#7B1FA2',
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            开始音节练习 🎯
          </motion.button>
        </div>
      )}
    </div>
  )
}
