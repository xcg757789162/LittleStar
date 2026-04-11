/**
 * 课堂渲染器模块
 *
 * 提供课堂 JSON 的 React 组件渲染能力。
 * ClassroomBridge 是主入口组件（原生 OpenMAIC Stage 渲染）。
 * Slide 组件保留作为备用渲染方案。
 */

// 原生课堂桥接组件（主入口）
export { ClassroomBridge } from './ClassroomBridge'

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
