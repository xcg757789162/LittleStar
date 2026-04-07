/**
 * 语音录制控制组件
 */

import { motion } from 'framer-motion'

export interface VoiceRecorderProps {
  onRecord: () => void
  isRecording: boolean
  disabled?: boolean
}

export function VoiceRecorder({ onRecord, isRecording, disabled = false }: VoiceRecorderProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <motion.button
        data-testid="voice-record-button"
        data-recording={isRecording ? 'true' : 'false'}
        onClick={() => !disabled && onRecord()}
        disabled={disabled}
        animate={isRecording ? { scale: [1, 1.15, 1] } : {}}
        transition={isRecording ? { repeat: Infinity, duration: 0.8 } : {}}
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          border: isRecording ? '4px solid #F44336' : '4px solid #E0E0E0',
          backgroundColor: isRecording ? '#FFCDD2' : '#FFF3E0',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '30px',
          boxShadow: isRecording ? '0 0 20px rgba(244, 67, 54, 0.4)' : '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        🎤
      </motion.button>
      {isRecording && (
        <span
          style={{
            fontSize: '14px',
            color: '#F44336',
            fontWeight: 'bold',
          }}
        >
          录音中...
        </span>
      )}
    </div>
  )
}
