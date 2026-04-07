/**
 * 手写/涂鸦板组件
 * Canvas 手写板，大字书写区域，彩色画笔，适配幼儿操作
 */

import { useRef, useCallback } from 'react'

export interface WritingPadProps {
  /** 书写提示 */
  prompt: string
  /** 提交回调 */
  onSubmit: (imageData?: string) => void
  /** 清除回调 */
  onClear: () => void
  /** 撤销回调 */
  onUndo: () => void
  /** 画笔颜色 */
  brushColor?: string
  /** 画笔粗细 */
  brushSize?: number
  /** 画布宽度 */
  width?: number
  /** 画布高度 */
  height?: number
}

export function WritingPad({
  prompt,
  onSubmit,
  onClear,
  onUndo,
  brushColor = '#333333',
  brushSize = 6,
  width = 320,
  height = 320,
}: WritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  const getPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        }
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    },
    [],
  )

  const startDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      isDrawingRef.current = true
      lastPosRef.current = getPos(e)
    },
    [getPos],
  )

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return

      const pos = getPos(e)
      ctx.beginPath()
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = brushColor
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
      lastPosRef.current = pos
    },
    [getPos, brushColor, brushSize],
  )

  const endDraw = useCallback(() => {
    isDrawingRef.current = false
  }, [])

  const handleSubmit = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const imageData = canvas.toDataURL('image/png')
      onSubmit(imageData)
    } else {
      onSubmit()
    }
  }, [onSubmit])

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    onClear()
  }, [onClear])

  return (
    <div
      style={{
        width: '100%',
        maxWidth: `${width + 32}px`,
        margin: '0 auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* 提示文字 */}
      <p
        style={{
          fontSize: '22px',
          fontWeight: 'bold',
          color: '#333',
          textAlign: 'center',
          marginBottom: '16px',
        }}
      >
        {prompt}
      </p>

      {/* 画布 */}
      <canvas
        ref={canvasRef}
        data-testid="writing-canvas"
        width={width}
        height={height}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        style={{
          border: '3px solid #FFB74D',
          borderRadius: '16px',
          backgroundColor: '#FFFDE7',
          touchAction: 'none',
          cursor: 'crosshair',
        }}
      />

      {/* 操作按钮 */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginTop: '16px',
        }}
      >
        <button
          onClick={() => onUndo()}
          style={{
            padding: '10px 20px',
            borderRadius: '16px',
            border: '2px solid #BDBDBD',
            backgroundColor: '#F5F5F5',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          撤销
        </button>
        <button
          onClick={handleClear}
          style={{
            padding: '10px 20px',
            borderRadius: '16px',
            border: '2px solid #FF8A65',
            backgroundColor: '#FFF3E0',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          清除
        </button>
        <button
          onClick={handleSubmit}
          style={{
            padding: '10px 24px',
            borderRadius: '16px',
            border: 'none',
            backgroundColor: '#66BB6A',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          完成
        </button>
      </div>
    </div>
  )
}
