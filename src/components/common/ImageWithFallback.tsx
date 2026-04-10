/**
 * ImageWithFallback 组件
 *
 * 通用图片渲染组件，提供加载失败兜底：
 * - 检测 OpenMAIC gen_img_/gen_vid_ 占位符 → 显示"图片由 AI 生成"提示
 * - 图片 URL 加载失败 → 显示占位图
 * - 正常 URL → 直接渲染 <img>
 */

import { useState, useCallback } from 'react'
import { isMediaPlaceholder, resolveMediaUrl } from '@/utils/media-url'

export interface ImageWithFallbackProps {
  /** 原始图片 URL（可能是 gen_img_* 占位符） */
  src: string | undefined
  /** alt 属性 */
  alt?: string
  /** 额外的 className */
  className?: string
  /** 自定义宽度（占位图用） */
  width?: number | string
  /** 自定义高度（占位图用） */
  height?: number | string
}

/** 占位图样式：柔和的灰色背景 + 图片图标 */
function PlaceholderBox({
  message,
  className,
  width,
  height,
}: {
  message: string
  className?: string
  width?: number | string
  height?: number | string
}) {
  return (
    <div
      className={className}
      style={{
        width: width ?? '100%',
        height: height ?? 200,
        backgroundColor: '#EDF2F7',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 32 }} role="img" aria-label="图片">
        🖼️
      </span>
      <span
        style={{
          fontSize: 13,
          color: '#718096',
          textAlign: 'center',
          padding: '0 16px',
        }}
      >
        {message}
      </span>
    </div>
  )
}

export function ImageWithFallback({
  src,
  alt = '',
  className,
  width,
  height,
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false)

  const handleError = useCallback(() => {
    setHasError(true)
  }, [])

  // OpenMAIC 占位符 → 显示"图片由 AI 生成"提示
  if (isMediaPlaceholder(src)) {
    return (
      <PlaceholderBox
        message="图片由 AI 生成中..."
        className={className}
        width={width}
        height={height}
      />
    )
  }

  // 解析 URL
  const resolvedUrl = resolveMediaUrl(src)

  // 无有效 URL 或加载失败 → 显示占位图
  if (!resolvedUrl || hasError) {
    return (
      <PlaceholderBox
        message="图片暂不可用"
        className={className}
        width={width}
        height={height}
      />
    )
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      className={className}
      style={{ width, height, display: 'block' }}
      onError={handleError}
    />
  )
}
