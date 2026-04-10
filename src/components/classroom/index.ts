/**
 * 课堂渲染器模块
 *
 * 提供课堂 JSON 的 React 组件渲染能力。
 * ClassroomIframe 是主入口组件（通过 iframe 嵌入 OpenMAIC 原生前端）。
 * Slide 组件保留作为备用渲染方案。
 */

// iframe 嵌入组件（主入口）
export { ClassroomIframe } from './ClassroomIframe'
export type { ClassroomIframeProps } from './ClassroomIframe'

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
