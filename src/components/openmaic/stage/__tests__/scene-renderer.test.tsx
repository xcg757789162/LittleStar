import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../slide-renderer/Editor', async () => {
  const ReactModule = await import('react')
  const { useMediaStageId } = await import('@/lib/openmaic/contexts/media-stage-context')

  return {
    SlideEditor: () =>
      ReactModule.createElement('div', {
        'data-testid': 'slide-renderer',
        'data-stage-id': useMediaStageId() ?? 'missing',
      }),
  }
})

vi.mock('../../scene-renderers/quiz-view', () => ({
  QuizView: () => null,
}))

vi.mock('../../scene-renderers/interactive-renderer', () => ({
  InteractiveRenderer: () => null,
}))

vi.mock('../../scene-renderers/pbl-renderer', () => ({
  PBLRenderer: () => null,
}))

import { SceneRenderer } from '../scene-renderer'

describe('SceneRenderer media stage context', () => {
  it('provides scene.stageId to slide renderer subtree', () => {
    const markup = renderToStaticMarkup(
      <SceneRenderer
        mode="playback"
        scene={{
          id: 'scene-1',
          stageId: 'stage-media-1',
          title: 'Intro',
          type: 'slide',
          order: 0,
          content: {
            type: 'slide',
            canvas: {
              elements: [],
            },
          },
          actions: [],
        }}
      />,
    )

    expect(markup).toContain('data-stage-id="stage-media-1"')
  })
})
