/**
 * KnowledgePage — 知识模块 · 热拔插课程创造厅
 *
 * 视觉方向：与首页 "Sunny Playground" 保持一致的暖光乐园 +
 *          一点"知识炼金"的糖果魔法色（金橘 + 粉 + 薄荷），
 *          通过轻粒子 / 光环卡片与首页拉开层次但保持色调协调。
 *
 * 字体：全局统一使用 'Baloo 2' / 'Nunito'（与首页、复习、家长中心一致）
 *
 * 功能：
 *   - 课程列表（系统课程 + 用户自建课程），支持重命名 / 删除
 *   - 创建新课程：与 LLM 进行苏格拉底对话，最后确认名字并触发初始化
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useChildStore } from '@/stores/childStore'
import {
  useCourses,
  useRenameCourse,
  useDeleteCourse,
  useCourseDialog,
  useFinalizeCourse,
  useRetryCourseInit,
  useCourseInitProgress,
  useContinueCourse,
} from '@/hooks/queries/useCourses'
import { buildPreGenerationChildSettings } from '@/hooks/usePreGeneration'
import type { Course, CourseDialogMessage } from '@/types/course'
import { apiClient } from '@/services/api'
import { PinVerification } from '@/components/parent/PinVerification'
import { isParentPinUnlocked, markParentPinUnlocked } from '@/components/parent/RequirePin'

// ============================================================
// 设计 Token —— Sunny Playground · Knowledge Lab
// 与 Home 首页色系保持协调（奶油米 + 蜜桃橘 + 糖果粉 + 薄荷蓝）
// ============================================================

const T = {
  // 背景（与 Home bgGradient 协调：略偏暖金奶油色）
  bgTop: '#FFF8E7',
  bgBottom: '#FFE8D6',
  // 主题色
  amber: '#FF8C42',        // 蜜桃橘（= Home sunOrange）
  amberBright: '#FFD166',  // 阳光黄（= Home sunYellow）
  amberDeep: '#D94F5C',    // 草莓红
  accentMint: '#2EC4B6',   // 薄荷绿（同 Home）
  accentPink: '#FF6B9D',   // 糖果粉（同 Home）
  accentSky: '#5BC0EB',    // 天空蓝（同 Home）
  // 中央知识星核渐变
  flaskGrad: 'linear-gradient(135deg, #FFD66B 0%, #FF8C42 55%, #D94F5C 100%)',
  // 文字
  parchment: '#5C3A24',      // 深可可棕（在暖奶油底上易读）
  parchmentDim: 'rgba(92, 58, 36, 0.68)',
  ink: '#3A2618',
  // 卡片（奶油玻璃）
  glass: 'rgba(255, 255, 255, 0.75)',
  glassBorder: 'rgba(255, 140, 66, 0.25)',
  glassHover: 'rgba(255, 255, 255, 0.95)',
  // 系统课程徽章
  systemBadge: 'rgba(255, 140, 66, 0.14)',
  // 状态色（偏甜圆润）
  initializing: '#2EC4B6',
  failed: '#E27D89',
  ready: '#56C271',
}

// 全局统一使用 Baloo 2 / Nunito（与首页、复习、家长中心一致）
const FONT_DISPLAY = "'Baloo 2', 'Nunito', 'PingFang SC', sans-serif"
const FONT_BODY = "'Nunito', 'PingFang SC', sans-serif"
const FONT_UI = "'Nunito', system-ui, sans-serif"

// ============================================================
// 错误翻译：把后端 / 网络错误翻译成对小朋友也能看懂的友好文案
// ============================================================

function friendlyErrorMessage(raw: unknown): { title: string; detail?: string } {
  const msg = raw instanceof Error ? raw.message : String(raw || '')
  const lower = msg.toLowerCase()

  // LLM 未配置
  if (msg.includes('LLM 未配置') || msg.includes('llmModel') || msg.includes('llmApiKey')) {
    return {
      title: '还没设好脑袋里的 AI 老师 🤖',
      detail: '请家长到「家长中心 → 设置」里填写 LLM 模型和 API Key，再回来继续对话。',
    }
  }
  // 登录过期 / 未登录
  if (msg.includes('Authorization') || msg.includes('token') || /401|403/.test(msg)) {
    return {
      title: '登录状态不见啦 🔐',
      detail: '请家长重新登录一次，再来烧制课程。',
    }
  }
  // 超时 / 网络
  if (
    lower.includes('timeout') ||
    lower.includes('aborted') ||
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    msg.includes('502') ||
    msg.includes('504')
  ) {
    return {
      title: 'AI 老师走神了 🌫️',
      detail: '网络或 LLM 响应超时了，稍等一下再发一次，通常能恢复。',
    }
  }
  // 配额 / 额度
  if (lower.includes('quota') || lower.includes('rate') || lower.includes('billing') || msg.includes('429')) {
    return {
      title: 'AI 老师今天累啦 💤',
      detail: 'LLM 接口的配额或速率被限制了，过一会儿再试，或检查 API Key 额度。',
    }
  }
  // slug 冲突
  if (msg.includes('slug') && msg.includes('unique')) {
    return {
      title: '这个课程名已经被占用了 📚',
      detail: '换一个名字或让 AI 再想想课程名。',
    }
  }
  // LLM 没按格式回复（对话轮）
  if (msg.includes('non-JSON') || msg.includes('malformed JSON') || msg.includes('no JSON')) {
    return {
      title: 'AI 老师忘了怎么回话了 🤔',
      detail: '它没按约定的格式回复。再发一句给它试试，通常第二次就会回正常了。',
    }
  }
  // 课程初始化阶段 JSON 解析失败
  if (msg.includes('Failed to parse JSON') || msg.includes('JSON 解析失败') || msg.includes('outline JSON') || msg.includes('placement JSON')) {
    return {
      title: 'AI 老师写的大纲乱码了 📝',
      detail: '这通常是 LLM 输出格式波动导致的，点「重试初始化」再来一次，多半就好了。',
    }
  }
  // 课程初始化阶段大纲/题目为空
  if (msg.includes('no modules') || msg.includes('no valid placement questions') || msg.includes('has no questions')) {
    return {
      title: 'AI 老师没整出靠谱的内容 🤷',
      detail: '大纲或测评题为空/都被判无效。点「重试初始化」再烧制一次试试。',
    }
  }
  // fallback
  return {
    title: '对话没接上 😵‍💫',
    detail: msg ? msg.slice(0, 200) : undefined,
  }
}

// ============================================================
// 字体 / 粒子动画 全局样式（只注入一次）
// ============================================================

const GLOBAL_STYLE = `
  @keyframes ks-float-particle {
    0% { transform: translate(0, 0); opacity: 0; }
    10% { opacity: 0.65; }
    90% { opacity: 0.65; }
    100% { transform: translate(var(--dx, 30px), -200px); opacity: 0; }
  }
  @keyframes ks-flask-bubble {
    0% { transform: translateY(0) scale(0.5); opacity: 0; }
    50% { opacity: 0.9; }
    100% { transform: translateY(-28px) scale(1.1); opacity: 0; }
  }
  @keyframes ks-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes ks-card-appear {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes ks-dots {
    0%, 20% { opacity: 0.25; }
    50% { opacity: 1; }
    80%, 100% { opacity: 0.25; }
  }
  @keyframes ks-bubble-in {
    from { opacity: 0; transform: translateY(8px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  /* Sunny Playground 基础 —— 与首页保持协调的暖奶油 + 蜜桃 + 糖果粉 + 薄荷 */
  .ks-parchment-bg {
    background:
      radial-gradient(circle at 18% 82%, rgba(255, 209, 102, 0.35), transparent 55%),
      radial-gradient(circle at 82% 18%, rgba(255, 107, 157, 0.22), transparent 50%),
      radial-gradient(circle at 52% 48%, rgba(46, 196, 182, 0.18), transparent 60%),
      linear-gradient(170deg, #FFF8E7 0%, #FFE8D6 32%, #FFDEE9 62%, #D4F1F9 100%);
  }
  /* 浅底下不再加颗粒噪点（否则会在暖色上显脏）；保留占位以兼容 class 引用 */
  .ks-grain::before { content: none; }
`

// ============================================================
// 装饰：浮动粒子背景
// ============================================================

function FloatingParticles() {
  // useState lazy initializer 保证粒子在组件 mount 时计算一次，
  // 而 useMemo 在 React 严格模式里会被警告为 impure。
  const [particles] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 8 + Math.random() * 12,
      dx: (Math.random() - 0.5) * 120,
      size: 2 + Math.random() * 4,
      color: Math.random() > 0.5 ? T.amber : T.amberBright,
    })),
  )

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', inset: 0, overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animation: `ks-float-particle ${p.duration}s ${p.delay}s ease-out infinite`,
            ['--dx' as string]: `${p.dx}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

// ============================================================
// 课程卡片
// ============================================================

function CourseCard({
  course,
  onOpen,
  onRename,
  onDelete,
  onRetry,
  onContinueDialog,
  onContinueNextStage,
  continuationBusy,
}: {
  course: Course
  onOpen: () => void
  onRename: (c: Course) => void
  onDelete: (c: Course) => void
  onRetry: (c: Course) => void
  onContinueDialog: (c: Course) => void
  onContinueNextStage?: (c: Course) => void
  continuationBusy?: boolean
}) {
  const isReady = course.status === 'ready'
  const isInit = course.status === 'initializing'
  const isFailed = course.status === 'failed'
  const isDraft = course.status === 'draft'

  // 拉当前初始化任务的 progress / step，仅在 initializing 时开启轮询
  const progressQ = useCourseInitProgress(course.id, isInit)
  const progressPct = Math.max(0, Math.min(100, progressQ.data?.progress ?? 0))
  const stepLabel = progressQ.data?.stepLabel

  const statusLabel = isReady
    ? '已就绪'
    : isInit
    ? (stepLabel || '正在烧制中…')
    : isFailed
    ? '初始化失败'
    : '草稿'
  const statusColor = isReady ? T.ready : isInit ? T.initializing : isFailed ? T.failed : T.parchmentDim

  const ratio = course.completionRatio
  const showMasteryHint =
    isReady && ratio != null && Number.isFinite(ratio) && ratio >= 0 && ratio <= 1
  const canNextStage =
    isReady &&
    onContinueNextStage &&
    ratio != null &&
    Number.isFinite(ratio) &&
    ratio >= 0.8

  const handleClick = () => {
    if (isReady) onOpen()
    else if (isDraft) onContinueDialog(course)
  }

  return (
    <div
      role="group"
      aria-label={`课程 ${course.name}`}
      style={{
        position: 'relative',
        background: T.glass,
        border: `1px solid ${T.glassBorder}`,
        borderRadius: '18px',
        padding: '18px 20px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 4px 14px rgba(92, 58, 36, 0.08)',
        cursor: isReady || isDraft ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
        animation: 'ks-card-appear 0.45s ease both',
      }}
      onMouseEnter={(e) => {
        if (isReady || isDraft) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.background = T.glassHover
          e.currentTarget.style.boxShadow = `0 10px 28px rgba(255, 140, 66, 0.18), 0 0 0 1px ${T.amber}66`
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.background = T.glass
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(92, 58, 36, 0.08)'
      }}
      onClick={handleClick}
    >
      {/* 顶部：emoji + 名字 + 状态 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          aria-hidden
          style={{
            width: 48, height: 48,
            borderRadius: '14px',
            background: `linear-gradient(135deg, ${course.colorHex}44, ${course.colorHex}22)`,
            border: `1px solid ${course.colorHex}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
            flexShrink: 0,
          }}
        >
          {course.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 20,
            fontWeight: 800,
            color: T.parchment,
            letterSpacing: '0.01em',
            lineHeight: 1.2,
            display: 'flex', alignItems: 'baseline', gap: 8,
            flexWrap: 'wrap',
          }}>
            {course.name}
            {course.isSystem && (
              <span style={{
                fontFamily: FONT_UI,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: 8,
                background: T.systemBadge,
                color: T.amber,
                border: `1px solid ${T.amberDeep}55`,
              }}>Built-in</span>
            )}
          </div>
          <div style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            color: statusColor,
            marginTop: 4,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span
              aria-hidden
              style={{
                width: 6, height: 6, borderRadius: '50%',
                backgroundColor: statusColor,
                animation: isInit ? 'ks-dots 1.2s infinite' : 'none',
              }}
            />
            {statusLabel}
            {isInit && <span style={{ opacity: 0.7 }}>· 通常需要 2-5 分钟</span>}
          </div>
          {showMasteryHint && (
            <div style={{
              fontFamily: FONT_BODY,
              fontSize: 12,
              color: T.parchmentDim,
              marginTop: 6,
            }}>
              知识点掌握度约 <strong style={{ color: T.ready }}>{Math.round((ratio as number) * 100)}%</strong>
              {(ratio as number) >= 0.8 && ' · 可续开下一阶段'}
            </div>
          )}
          {(course.parentCourseId != null || course.stageIndex > 0) && (
            <div style={{
              marginTop: 6,
              fontFamily: FONT_UI,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: T.accentMint,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span aria-hidden style={{ opacity: 0.85 }}>⤴</span>
              进阶链 · 第 {course.stageIndex} 阶段
            </div>
          )}
        </div>
      </div>

      {/* 初始化进度条 */}
      {isInit && (
        <div style={{ marginTop: 14 }}>
          <div
            aria-hidden
            style={{
              position: 'relative',
              height: 8,
              borderRadius: 999,
              background: 'rgba(46, 196, 182, 0.15)',
              overflow: 'hidden',
              border: `1px solid ${T.initializing}33`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${T.initializing}, ${T.amberBright})`,
                borderRadius: 999,
                transition: 'width 0.6s ease',
                boxShadow: `0 0 12px ${T.initializing}55`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                backgroundSize: '200% 100%',
                animation: 'ks-shimmer 2.2s linear infinite',
                mixBlendMode: 'overlay',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
              fontFamily: FONT_BODY,
              fontSize: 11,
              color: T.parchmentDim,
            }}
          >
            <span>{stepLabel || '排队中…'}</span>
            <span style={{ fontWeight: 700, color: T.initializing }}>
              {progressPct}%
            </span>
          </div>
        </div>
      )}

      {/* 底部操作 */}
      {/*
        所有课程都可以删除（含预置的数学 / 语文 / 英语）。
        改名 / 重试 / 继续对话 仍只对自建课程开放，因为系统课程的 name 由 RLS 策略锁定，
        且 ready 状态的系统课程不存在失败/草稿场景。
      */}
      <div style={{
        display: 'flex', gap: 8, marginTop: 14,
        paddingTop: 12,
        borderTop: `1px dashed ${T.glassBorder}`,
      }}>
        {!course.isSystem && isFailed && (
          <button
            onClick={(e) => { e.stopPropagation(); onRetry(course) }}
            style={btnStyle('primary')}
          >
            🔄 重试初始化
          </button>
        )}
        {!course.isSystem && isDraft && (
          <button
            onClick={(e) => { e.stopPropagation(); onContinueDialog(course) }}
            style={btnStyle('primary')}
          >
            继续对话
          </button>
        )}
        {canNextStage && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onContinueNextStage!(course)
            }}
            disabled={continuationBusy}
            style={{
              ...btnStyle('primary'),
              opacity: continuationBusy ? 0.55 : 1,
              cursor: continuationBusy ? 'wait' : 'pointer',
            }}
          >
            🔮 下一阶段
          </button>
        )}
        {!course.isSystem && (
          <button
            onClick={(e) => { e.stopPropagation(); onRename(course) }}
            style={btnStyle('ghost')}
          >
            ✏️ 改名
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(course) }}
          style={btnStyle('danger')}
        >
          🗑 删除
        </button>
      </div>

      {isFailed && course.initError && (() => {
        const fe = friendlyErrorMessage(course.initError)
        return (
          <div style={{
            marginTop: 10, padding: '10px 12px',
            borderRadius: 10,
            background: `${T.amberDeep}12`,
            border: `1px solid ${T.amberDeep}55`,
            fontFamily: FONT_BODY,
            fontSize: 13,
            color: T.parchment,
            lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 700, color: T.amberDeep, marginBottom: 2 }}>{fe.title}</div>
            {fe.detail && <div style={{ color: T.parchmentDim }}>{fe.detail}</div>}
            <details style={{ marginTop: 6 }}>
              <summary style={{ cursor: 'pointer', color: T.parchmentDim, fontSize: 11 }}>
                查看原始错误
              </summary>
              <div style={{
                marginTop: 4,
                padding: '6px 8px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.6)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 11,
                color: T.parchmentDim,
                wordBreak: 'break-all',
              }}>
                {course.initError.slice(0, 300)}
              </div>
            </details>
          </div>
        )
      })()}
    </div>
  )
}

function btnStyle(variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: FONT_UI,
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }
  if (variant === 'primary') return {
    ...base,
    background: T.flaskGrad,
    color: '#FFF8E7',
    borderColor: 'transparent',
    boxShadow: `0 4px 14px ${T.amber}40`,
  }
  if (variant === 'danger') return {
    ...base,
    background: 'rgba(226, 125, 137, 0.10)',
    color: T.failed,
    borderColor: `${T.failed}66`,
  }
  return {
    ...base,
    background: 'rgba(255, 255, 255, 0.75)',
    color: T.parchment,
    borderColor: T.glassBorder,
  }
}

// ============================================================
// Socratic 对话气泡
// ============================================================

function DialogBubble({ message, index }: { message: CourseDialogMessage; index: number }) {
  const isUser = message.role === 'user'
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        animation: 'ks-bubble-in 0.4s ease both',
        animationDelay: `${index * 0.04}s`,
      }}
    >
      <div
        style={{
          maxWidth: '78%',
          padding: '12px 16px',
          borderRadius: isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
          background: isUser
            ? `linear-gradient(135deg, ${T.amberBright} 0%, ${T.amber} 100%)`
            : '#FFFFFF',
          color: isUser ? '#5C3A24' : T.ink,
          border: isUser ? 'none' : `1px solid ${T.glassBorder}`,
          fontFamily: FONT_BODY,
          fontSize: 15,
          lineHeight: 1.6,
          boxShadow: isUser
            ? `0 6px 16px rgba(255, 140, 66, 0.28)`
            : `0 6px 16px rgba(92, 58, 36, 0.08)`,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.content}
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{
        padding: '14px 20px',
        borderRadius: '20px 20px 20px 6px',
        background: '#FFFFFF',
        border: `1px solid ${T.glassBorder}`,
        display: 'flex', gap: 6, alignItems: 'center',
        boxShadow: '0 6px 16px rgba(92, 58, 36, 0.08)',
      }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 7, height: 7, borderRadius: '50%',
              backgroundColor: T.amber,
              display: 'inline-block',
              animation: `ks-dots 1.1s ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Dialog 视图：与 LLM 对话
// ============================================================

function DialogPanel({
  initialCourse,
  onDone,
  onBack,
}: {
  initialCourse: Course | null // 如果是 null，则进入后发第一条创建新课程
  onDone: () => void
  onBack: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const currentChild = useChildStore((s) => s.currentChild)
  const [courseId, setCourseId] = useState<number | undefined>(initialCourse?.id)
  const [messages, setMessages] = useState<CourseDialogMessage[]>(initialCourse?.dialogHistory || [])
  const [input, setInput] = useState('')
  const [spec, setSpec] = useState(initialCourse?.requirementSpec || {})
  const [ready, setReady] = useState(false)
  // 本轮 LLM 给出的 3 个快捷候选（点击胶囊或输入 1/2/3·A/B/C 直接选）
  const initialReplies = (() => {
    const history = initialCourse?.dialogHistory || []
    for (let i = history.length - 1; i >= 0; i--) {
      const m = history[i]
      if (m.role === 'assistant' && m.suggestedReplies && m.suggestedReplies.length > 0) {
        return m.suggestedReplies
      }
      if (m.role === 'user') break
    }
    return []
  })()
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>(initialReplies)
  const [suggested, setSuggested] = useState<{
    name?: string
    emoji?: string
    colorHex?: string
    slug?: string
  }>({})

  const dialogMut = useCourseDialog()
  const finalizeMut = useFinalizeCourse()
  const abandonMut = useDeleteCourse()

  // 尝试带"放弃草稿"语义地返回：
  // - 若当前会话已产生 draft courseId（status 还是 draft），问用户要不要丢弃
  // - 用户选"继续保留"则保留，回首页仍可从未完成列表进来续聊
  // - 用户选"放弃"则调用 DELETE /api/courses/:id 清掉这行
  const handleBackWithAbandon = async () => {
    const isOngoingDraft =
      courseId !== undefined &&
      (initialCourse?.status === 'draft' || initialCourse === null) &&
      !finalizeMut.isSuccess
    if (!isOngoingDraft) {
      onBack()
      return
    }
    const keep = window.confirm(
      '对话还没完成，要保留这份草稿以后继续吗？\n\n点「确定」保留，点「取消」放弃这次对话。',
    )
    if (keep) {
      onBack()
      return
    }
    try {
      await abandonMut.mutateAsync(courseId!)
    } catch (err) {
      console.warn('[KnowledgePage] 放弃草稿失败（忽略）:', err)
    } finally {
      onBack()
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // 用 requestAnimationFrame 让布局先算完（胶囊出现会挤压消息区），再滚到底
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el) return
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    })
  }, [messages, dialogMut.isPending, suggestedReplies.length, ready])

  /**
   * 把用户输入解析为真正要发送的文本：
   *   - "1"/"2"/"3"（可带 . 。 、 ) ）等尾标）→ 对应 suggestedReplies[i]
   *   - 其它：按原文发
   */
  const resolveShortcut = (raw: string): string | null => {
    if (suggestedReplies.length === 0) return null
    const t = raw.trim().replace(/[.。、)）\s]+$/, '')
    const mapNum: Record<string, number> = { '1': 0, '2': 1, '3': 2 }
    if (t.length === 1 && mapNum[t] !== undefined && suggestedReplies[mapNum[t]]) {
      return suggestedReplies[mapNum[t]]
    }
    return null
  }

  const sendMessage = async (override?: string) => {
    const raw = (override ?? input).trim()
    if (!raw || !user || !currentChild) return
    const expanded = resolveShortcut(raw) ?? raw
    if (override === undefined) setInput('')
    const userMsg: CourseDialogMessage = {
      role: 'user',
      content: expanded,
      timestamp: new Date().toISOString(),
    }
    setMessages((m) => [...m, userMsg])
    setSuggestedReplies([]) // 发出去之前就先收起胶囊，避免连点

    const childSettings = buildPreGenerationChildSettings(currentChild) as Record<string, unknown>

    try {
      const resp = await dialogMut.mutateAsync({
        courseId,
        userId: user.id,
        userMessage: expanded,
        childSettings,
      })
      setCourseId(resp.courseId)
      setSpec(resp.spec)
      setReady(resp.ready)
      setSuggestedReplies(resp.ready ? [] : (resp.suggestedReplies || []))
      setSuggested({
        name: resp.suggestedName,
        emoji: resp.suggestedEmoji,
        colorHex: resp.suggestedColorHex,
        slug: resp.suggestedSlug,
      })
      setMessages((m) => [...m, {
        role: 'assistant',
        content: resp.assistantMessage,
        timestamp: new Date().toISOString(),
        suggestedReplies: resp.ready ? undefined : (resp.suggestedReplies || undefined),
      }])
    } catch (err) {
      const fe = friendlyErrorMessage(err)
      setMessages((m) => [...m, {
        role: 'assistant',
        content: fe.detail ? `${fe.title}\n\n${fe.detail}` : fe.title,
        timestamp: new Date().toISOString(),
      }])
    }
  }

  const handleFinalize = async () => {
    if (!courseId || !user || !currentChild) return
    const childSettings = buildPreGenerationChildSettings(currentChild) as Record<string, unknown>
    try {
      await finalizeMut.mutateAsync({
        courseId,
        userId: user.id,
        childId: Number(currentChild.id),
        name: suggested.name || '新课程',
        emoji: suggested.emoji,
        colorHex: suggested.colorHex,
        slug: suggested.slug,
        childAge: currentChild.age,
        childSettings,
      })
      onDone()
    } catch (err) {
      const fe = friendlyErrorMessage(err)
      alert(fe.detail ? `${fe.title}\n\n${fe.detail}` : fe.title)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%',
      gap: 16,
    }}>
      {/* 顶栏 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 4px',
      }}>
        <button
          onClick={() => { void handleBackWithAbandon() }}
          disabled={abandonMut.isPending}
          style={{
            ...btnStyle('ghost'),
            padding: '6px 14px',
            fontSize: 13,
            opacity: abandonMut.isPending ? 0.5 : 1,
          }}
        >
          ← 返回
        </button>
        <div style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 22,
          color: T.parchment,
          fontWeight: 800,
          letterSpacing: '0.01em',
        }}>
          {initialCourse ? '继续对话' : '烧制一门新课程'}
        </div>
      </div>

      {/* Spec 摘要 */}
      {Object.keys(spec).filter((k) => k !== 'ready' && spec[k as keyof typeof spec]).length > 0 && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 12,
          background: 'rgba(255, 255, 255, 0.7)',
          border: `1px dashed ${T.amber}88`,
          fontFamily: FONT_BODY,
          fontSize: 13,
          color: T.parchmentDim,
          display: 'flex', flexWrap: 'wrap', gap: '4px 14px',
        }}>
          {spec.topic && <span>✦ 主题：<b style={{ color: T.amber }}>{spec.topic}</b></span>}
          {spec.level && <span>✦ 水平：<b style={{ color: T.amber }}>{spec.level}</b></span>}
          {spec.goal && <span>✦ 目标：<b style={{ color: T.amber }}>{spec.goal}</b></span>}
          {spec.scope && <span>✦ 范围：<b style={{ color: T.amber }}>{spec.scope}</b></span>}
          {spec.depth && <span>✦ 深度：<b style={{ color: T.amber }}>{spec.depth}</b></span>}
        </div>
      )}

      {/* 对话流 */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.length === 0 && !dialogMut.isPending && (
          <div style={{
            display: 'flex', justifyContent: 'flex-start',
          }}>
            <div style={{
              maxWidth: '78%',
              padding: '14px 18px',
              borderRadius: '20px 20px 20px 6px',
              background: '#FFFFFF',
              border: `1px solid ${T.glassBorder}`,
              color: T.ink,
              fontFamily: FONT_BODY,
              fontSize: 15,
              lineHeight: 1.6,
              boxShadow: '0 6px 16px rgba(92, 58, 36, 0.08)',
            }}>
              你好呀 ✨ 告诉我，你最近想学点什么？可以是一整门学科，也可以是某个让你好奇的小知识。
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <DialogBubble key={i} message={msg} index={i} />
        ))}

        {dialogMut.isPending && <TypingBubble />}
      </div>

      {/* Ready 确认区 */}
      {ready && suggested.name && !finalizeMut.isPending && !finalizeMut.isSuccess && (
        <div style={{
          padding: '16px 18px',
          borderRadius: 16,
          background: 'rgba(255, 255, 255, 0.85)',
          border: `2px solid ${T.amber}`,
          boxShadow: `0 10px 30px ${T.amber}33`,
        }}>
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 26,
            color: T.amberDeep,
            fontWeight: 700,
          }}>
            ✨ 为你准备好了一门
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0 14px',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `linear-gradient(135deg, ${suggested.colorHex}66, ${suggested.colorHex}22)`,
              border: `1px solid ${suggested.colorHex}aa`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>
              {suggested.emoji}
            </div>
            <div style={{
              fontFamily: FONT_BODY,
              fontSize: 26,
              fontWeight: 600,
              color: T.parchment,
            }}>
              《{suggested.name}》
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleFinalize}
              style={{
                ...btnStyle('primary'),
                padding: '10px 20px',
                fontSize: 14,
              }}
            >
              就它了，开始烧制 →
            </button>
            <button
              onClick={() => {
                setReady(false)
                setInput('不太对，我想再聊聊')
              }}
              style={{ ...btnStyle('ghost'), padding: '10px 16px', fontSize: 14 }}
            >
              再想想
            </button>
          </div>
        </div>
      )}

      {finalizeMut.isPending && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          fontFamily: FONT_DISPLAY,
          fontSize: 22,
          color: T.amberDeep,
          fontWeight: 700,
        }}>
          正在为你点燃炼金炉… 🧪
        </div>
      )}

      {/* 快捷候选胶囊：点击直接发送，或直接在输入框打 1/2/3·A/B/C */}
      {!ready && suggestedReplies.length > 0 && !dialogMut.isPending && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            padding: '2px 2px 4px',
          }}
        >
          {suggestedReplies.map((opt, i) => {
            const num = i + 1
            return (
              <button
                key={i}
                onClick={() => { void sendMessage(opt) }}
                disabled={dialogMut.isPending}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px 8px 10px',
                  borderRadius: 999,
                  border: `1px solid ${T.amber}55`,
                  background: 'rgba(255, 255, 255, 0.92)',
                  color: T.parchment,
                  fontFamily: FONT_BODY,
                  fontSize: 13.5,
                  lineHeight: 1.4,
                  cursor: dialogMut.isPending ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(92, 58, 36, 0.06)',
                  transition: 'all 0.15s ease',
                  maxWidth: '100%',
                  whiteSpace: 'normal',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (dialogMut.isPending) return
                  e.currentTarget.style.background = '#FFFFFF'
                  e.currentTarget.style.borderColor = `${T.amber}AA`
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = `0 6px 16px ${T.amber}33`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.92)'
                  e.currentTarget.style.borderColor = `${T.amber}55`
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(92, 58, 36, 0.06)'
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: `linear-gradient(135deg, ${T.amberBright}, ${T.amber})`,
                    color: '#FFFFFF',
                    fontFamily: FONT_UI,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {num}
                </span>
                <span>{opt}</span>
              </button>
            )
          })}
          <div
            style={{
              flexBasis: '100%',
              fontFamily: FONT_UI,
              fontSize: 11,
              color: T.parchmentDim,
              padding: '2px 6px 0',
              opacity: 0.85,
            }}
          >
            💡 提示：直接在输入框打 1/2/3 也能选，都不合适就自己写
          </div>
        </div>
      )}

      {/* 输入区 */}
      {!ready && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          padding: '10px 12px',
          borderRadius: 20,
          background: 'rgba(255, 255, 255, 0.85)',
          border: `1px solid ${T.glassBorder}`,
          boxShadow: '0 4px 14px rgba(92, 58, 36, 0.06)',
          backdropFilter: 'blur(8px)',
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendMessage()
              }
            }}
            placeholder={
              suggestedReplies.length > 0
                ? '打 1/2/3 选上面的选项，或自己写…'
                : '写下你的想法… 按 Enter 发送'
            }
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: T.parchment,
              fontFamily: FONT_BODY,
              fontSize: 15,
              lineHeight: 1.6,
              padding: '8px 6px',
              minHeight: 32,
              maxHeight: 120,
            }}
          />
          <button
            onClick={() => { void sendMessage() }}
            disabled={!input.trim() || dialogMut.isPending}
            style={{
              ...btnStyle('primary'),
              padding: '10px 18px',
              fontSize: 14,
              opacity: (!input.trim() || dialogMut.isPending) ? 0.5 : 1,
              cursor: (!input.trim() || dialogMut.isPending) ? 'not-allowed' : 'pointer',
            }}
          >
            发送
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 主页面
// ============================================================

export function KnowledgePage() {
  const user = useAuthStore((s) => s.user)
  const currentChild = useChildStore((s) => s.currentChild)
  const childIdNum = currentChild ? Number(currentChild.id) : undefined
  const coursesQ = useCourses({ includeDraft: true, childId: childIdNum })
  const renameMut = useRenameCourse()
  const deleteMut = useDeleteCourse()
  const retryMut = useRetryCourseInit()
  const continueMut = useContinueCourse()

  const [mode, setMode] = useState<'list' | 'dialog'>('list')
  const [dialogCourse, setDialogCourse] = useState<Course | null>(null)
  const [deletePinCourse, setDeletePinCourse] = useState<Course | null>(null)

  const courses = coursesQ.data || []
  const systemCourses = courses.filter((c) => c.isSystem)
  const myCourses = courses.filter((c) => !c.isSystem)

  const handleNewCourse = () => {
    setDialogCourse(null)
    setMode('dialog')
  }

  const handleContinueDialog = (c: Course) => {
    setDialogCourse(c)
    setMode('dialog')
  }

  const handleRename = async (c: Course) => {
    const newName = prompt('新名字：', c.name)?.trim()
    if (!newName || newName === c.name) return
    try {
      await renameMut.mutateAsync({ id: c.id, name: newName })
    } catch (err) {
      const fe = friendlyErrorMessage(err)
      alert(`改名失败：${fe.title}${fe.detail ? '\n\n' + fe.detail : ''}`)
    }
  }

  const confirmAndDelete = useCallback(async (c: Course) => {
    const msg = c.isSystem
      ? `《${c.name}》是预置学科，删除后会一并清空它的大纲、测评题、掌握度和所有孩子的学习记录。\n\n这个家里的所有孩子都将不再看到这门课，确定要继续吗？`
      : `确定删除《${c.name}》吗？这会一并删除它的大纲、测评题和学习记录。`
    if (!confirm(msg)) return
    try {
      await deleteMut.mutateAsync(c.id)
    } catch (err) {
      const fe = friendlyErrorMessage(err)
      alert(`删除失败：${fe.title}${fe.detail ? '\n\n' + fe.detail : ''}`)
    }
  }, [deleteMut])

  const savedParentPin = user?.parentPin ?? ''

  const handleDelete = useCallback((c: Course) => {
    if (!savedParentPin) {
      void confirmAndDelete(c)
      return
    }
    if (isParentPinUnlocked()) {
      void confirmAndDelete(c)
      return
    }
    setDeletePinCourse(c)
  }, [savedParentPin, confirmAndDelete])

  const persistParentPin = useCallback(async (pin: string) => {
    try {
      if (user?.id) {
        await apiClient.patch('/users', { parentPin: pin }, {
          filters: [{ column: 'id', operator: 'eq', value: user.id }],
        })
      }
      useAuthStore.setState((state) => ({
        user: state.user ? { ...state.user, parentPin: pin } : null,
      }))
    } catch {
      try {
        localStorage.setItem('littlestar_parent_pin_fallback', pin)
      } catch {
        /* ignore */
      }
    }
  }, [user?.id])

  const handleRetry = async (c: Course) => {
    if (!user || !currentChild) return
    const childSettings = buildPreGenerationChildSettings(currentChild) as Record<string, unknown>
    try {
      await retryMut.mutateAsync({
        courseId: c.id,
        userId: user.id,
        childId: Number(currentChild.id),
        childAge: currentChild.age,
        childSettings,
      })
    } catch (err) {
      alert('重试失败：' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleContinueNextStage = async (c: Course) => {
    if (!user || !currentChild) return
    const childSettings = buildPreGenerationChildSettings(currentChild) as Record<string, unknown>
    try {
      await continueMut.mutateAsync({
        parentCourseId: c.id,
        childId: Number(currentChild.id),
        childAge: currentChild.age,
        childSettings,
      })
    } catch (err) {
      const fe = friendlyErrorMessage(err)
      alert(`续阶失败：${fe.title}${fe.detail ? '\n\n' + fe.detail : ''}`)
    }
  }

  const handleOpen = () => {
    // 预置和自建课程都走首页统一入口（首页会展示所有 ready 的课程 + 测评/学习状态）
    window.location.href = '/'
  }

  return (
    <>
      <style>{GLOBAL_STYLE}</style>
      <div
        className="ks-parchment-bg ks-grain"
        style={{
          minHeight: '100vh',
          position: 'relative',
          padding: '24px 20px 100px',
          overflow: 'hidden',
        }}
      >
        <FloatingParticles />

        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
          {mode === 'list' && (
            <>
              {/* 标题区 */}
              <header style={{ marginBottom: 24 }}>
                <div style={{
                  fontFamily: FONT_UI,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.3em',
                  color: T.amber,
                  textTransform: 'uppercase',
                }}>
                  Knowledge Lab
                </div>
                <h1 style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 40,
                  fontWeight: 800,
                  color: T.parchment,
                  margin: '6px 0 6px',
                  lineHeight: 1.1,
                  letterSpacing: '0.01em',
                }}>
                  知识炼金室
                </h1>
                <p style={{
                  fontFamily: FONT_BODY,
                  fontSize: 15,
                  color: T.parchmentDim,
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  任何学科，任何知识点 —— 告诉我你想学什么，我为你定制一门专属课程。
                </p>
              </header>

              {/* 主 CTA */}
              <button
                onClick={handleNewCourse}
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  borderRadius: 18,
                  border: 'none',
                  background: T.flaskGrad,
                  backgroundSize: '200% 100%',
                  animation: 'ks-shimmer 6s ease-in-out infinite',
                  color: '#FFF8E7',
                  textShadow: '0 1px 2px rgba(92, 58, 36, 0.25)',
                  fontFamily: FONT_UI,
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  boxShadow: `0 10px 28px ${T.amber}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  marginBottom: 28,
                  transition: 'transform 0.15s',
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)' }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <span style={{ fontSize: 22 }}>🧪</span>
                点燃一门新课程
              </button>

              {/* 我的课程 */}
              {myCourses.length > 0 && (
                <section style={{ marginBottom: 28 }}>
                  <h2 style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 24,
                    fontWeight: 800,
                    color: T.amberDeep,
                    margin: '0 0 14px',
                  }}>
                    我炼制的 <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.parchmentDim, fontWeight: 400 }}>· {myCourses.length}</span>
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {myCourses.map((c) => (
                      <CourseCard
                        key={c.id}
                        course={c}
                        onOpen={handleOpen}
                        onRename={handleRename}
                        onDelete={handleDelete}
                        onRetry={handleRetry}
                        onContinueDialog={handleContinueDialog}
                        onContinueNextStage={currentChild ? handleContinueNextStage : undefined}
                        continuationBusy={continueMut.isPending}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* 系统课程 */}
              <section>
                <h2 style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 24,
                  fontWeight: 800,
                  color: T.parchment,
                  margin: '0 0 14px',
                }}>
                  预置收藏
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {systemCourses.map((c) => (
                    <CourseCard
                      key={c.id}
                      course={c}
                      onOpen={handleOpen}
                      onRename={handleRename}
                      onDelete={handleDelete}
                      onRetry={handleRetry}
                      onContinueDialog={handleContinueDialog}
                      onContinueNextStage={currentChild ? handleContinueNextStage : undefined}
                      continuationBusy={continueMut.isPending}
                    />
                  ))}
                </div>
              </section>

              {coursesQ.isLoading && (
                <div style={{
                  padding: 40,
                  textAlign: 'center',
                  fontFamily: FONT_DISPLAY,
                  fontSize: 20,
                  fontWeight: 700,
                  color: T.amberDeep,
                }}>
                  正在打开藏书柜…
                </div>
              )}
            </>
          )}

          {mode === 'dialog' && (
            // 固定高度（不是 minHeight），让 DialogPanel 内部的 flex:1 + overflow:auto 生效，
            // 输入框永远钉在底部，消息区自己滚动
            <div style={{ height: 'calc(100vh - 124px)', display: 'flex', overflow: 'hidden' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <DialogPanel
                  initialCourse={dialogCourse}
                  onBack={() => setMode('list')}
                  onDone={() => {
                    setMode('list')
                    void coursesQ.refetch()
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {deletePinCourse && (
        <PinVerification
          correctPin={savedParentPin}
          mode={savedParentPin ? 'verify' : 'setup'}
          onVerify={(ok) => {
            if (!ok) return
            markParentPinUnlocked()
            const c = deletePinCourse
            setDeletePinCourse(null)
            void confirmAndDelete(c)
          }}
          onCancel={() => setDeletePinCourse(null)}
          onSetPin={persistParentPin}
          maxAttempts={5}
        />
      )}
    </>
  )
}
