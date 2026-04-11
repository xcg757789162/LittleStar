/**
 * 语音播放控制组件
 */

import { motion } from 'motion/react'

export interface VoicePlayerProps {
  onPlay: () => void
  isPlaying: boolean
  disabled?: boolean
}

export function VoicePlayer({ onPlay, isPlaying, disabled = false }: VoicePlayerProps) {
  return (
    <motion.button
      data-testid="voice-play-button"
      data-playing={isPlaying ? 'true' : 'false'}
      onClick={() => !disabled && onPlay()}
      disabled={disabled}
      animate={isPlaying ? { scale: [1, 1.1, 1] } : {}}
      transition={isPlaying ? { repeat: Infinity, duration: 1 } : {}}
      style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: isPlaying ? '#66BB6A' : '#FFB74D',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      {isPlaying ? '🔊' : '▶️'}
    </motion.button>
  )
}
