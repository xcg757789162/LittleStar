/**
 * 选择题组件
 * 幼儿友好的大按钮选择题，支持图文选项
 */

import { motion } from 'framer-motion'

export interface ChoiceOption {
  id: string
  text: string
  imageUrl?: string
  isCorrect: boolean
}

export interface MultipleChoiceProps {
  /** 题目文本 */
  question: string
  /** 选项列表 */
  options: ChoiceOption[]
  /** 答题回调 */
  onAnswer: (optionId: string, isCorrect: boolean) => void
  /** 已选中的选项 ID */
  selectedId?: string
  /** 是否显示结果 */
  showResult?: boolean
  /** 是否禁用 */
  disabled?: boolean
}

function getButtonState(
  option: ChoiceOption,
  selectedId?: string,
  showResult?: boolean,
): string | undefined {
  if (!showResult || !selectedId) return undefined
  if (option.id === selectedId) {
    return option.isCorrect ? 'correct' : 'wrong'
  }
  if (option.isCorrect) return 'correct' // 显示正确答案
  return undefined
}

function getButtonColor(state: string | undefined): string {
  switch (state) {
    case 'correct':
      return '#C8E6C9'
    case 'wrong':
      return '#FFCDD2'
    default:
      return '#FFF3E0'
  }
}

function getBorderColor(state: string | undefined): string {
  switch (state) {
    case 'correct':
      return '#4CAF50'
    case 'wrong':
      return '#F44336'
    default:
      return '#FFB74D'
  }
}

export function MultipleChoice({
  question,
  options,
  onAnswer,
  selectedId,
  showResult = false,
  disabled = false,
}: MultipleChoiceProps) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '500px',
        margin: '0 auto',
        padding: '16px',
      }}
    >
      {/* 题目 */}
      <p
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#333',
          marginBottom: '24px',
        }}
      >
        {question}
      </p>

      {/* 选项网格 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: options.length <= 2 ? '1fr' : '1fr 1fr',
          gap: '16px',
        }}
      >
        {options.map((option) => {
          const state = getButtonState(option, selectedId, showResult)
          return (
            <motion.button
              key={option.id}
              data-state={state}
              onClick={() => !disabled && onAnswer(option.id, option.isCorrect)}
              disabled={disabled}
              whileTap={disabled ? undefined : { scale: 0.95 }}
              whileHover={disabled ? undefined : { scale: 1.02 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                borderRadius: '20px',
                border: `3px solid ${getBorderColor(state)}`,
                backgroundColor: getButtonColor(state),
                cursor: disabled ? 'default' : 'pointer',
                minHeight: '80px',
                opacity: disabled && state === undefined ? 0.6 : 1,
              }}
            >
              {option.imageUrl && (
                <img
                  src={option.imageUrl}
                  alt={option.text}
                  style={{
                    maxWidth: '80px',
                    maxHeight: '80px',
                    borderRadius: '12px',
                    marginBottom: '8px',
                    objectFit: 'contain',
                  }}
                />
              )}
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 'bold',
                  color: '#333',
                }}
              >
                {option.text}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
