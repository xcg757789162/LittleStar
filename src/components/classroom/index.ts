/**
 * 课堂渲染器模块
 *
 * 提供课堂 JSON 的 React 组件渲染能力。
 * ClassroomView 是主入口组件，内部使用工厂模式分发到各 Slide 组件。
 *
 * @example
 * ```tsx
 * import { ClassroomView } from '@/components/classroom'
 *
 * <ClassroomView
 *   classroom={classroomData}
 *   onComplete={() => console.log('课堂完成')}
 *   onAnswer={(data) => masteryTracker.record(data)}
 *   onAudioPlay={(url) => tts.play(url)}
 * />
 * ```
 */

// 主容器
export { ClassroomView } from './ClassroomView'
export type { ClassroomViewProps, SubjectType } from './ClassroomView'

// 幻灯片组件
export { TeachingSlide } from './TeachingSlide'
export type { TeachingSlideProps } from './TeachingSlide'

export { ImageSlide } from './ImageSlide'
export type { ImageSlideProps } from './ImageSlide'

export { QuizSlide } from './QuizSlide'
export type { QuizSlideProps, QuizAnswerData } from './QuizSlide'

export { TPRSlide } from './TPRSlide'
export type { TPRSlideProps } from './TPRSlide'

export { AudioSlide } from './AudioSlide'
export type { AudioSlideProps } from './AudioSlide'
