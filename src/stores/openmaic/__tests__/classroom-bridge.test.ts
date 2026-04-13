import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useClassroomBridgeStore } from '../classroom-bridge'
import { useStageStore } from '@/lib/openmaic/store/stage'
import type { Classroom } from '@/services/openmaic/types'

function createNativeClassroom(): Classroom {
  return {
    id: 'native-classroom-1',
    title: 'Native Classroom',
    status: 'completed',
    language: 'en',
    stage: {
      id: 'native-stage-1',
      name: 'Native Classroom',
      createdAt: 1710000000000,
      updatedAt: 1710000000000,
      language: 'en',
    },
    scenes: [
      {
        id: 'scene-1',
        title: 'Intro',
        type: 'slide',
        content: {
          type: 'slide',
          canvas: {
            elements: [{ type: 'text', content: '<p>Hello</p>' }],
          },
        },
        actions: [
          {
            id: 'action-1',
            type: 'speech',
            text: 'Hello children!',
            audioUrl: 'data:audio/mpeg;base64,hello-audio',
          },
        ],
      },
    ],
    outlines: [
      {
        id: 'outline-1',
        order: 0,
        index: 0,
        type: 'slide',
        title: 'Intro',
        description: 'Hello scene',
        keyPoints: ['hello'],
        mediaGenerations: [
          {
            type: 'image',
            prompt: 'cartoon hello children',
            elementId: 'gen_img_intro_1',
          },
        ],
      },
    ],
  }
}

function createLegacyClassroom(): Classroom {
  return {
    id: 'legacy-classroom-1',
    title: 'Legacy Classroom',
    status: 'completed',
    scenes: [
      {
        id: 'legacy-scene-1',
        title: 'Legacy Intro',
        type: 'teaching',
        slides: [
          {
            type: 'content',
            title: 'Legacy Hello',
            content: 'Hello',
            imageUrl: 'https://example.com/legacy.png',
            audioUrl: 'https://example.com/legacy.mp3',
          },
        ],
      },
    ],
  }
}

describe('useClassroomBridgeStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useStageStore.getState().clearStore()
    useClassroomBridgeStore.getState().reset()
  })

  afterEach(() => {
    useClassroomBridgeStore.getState().reset()
    useStageStore.getState().clearStore()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('loads native classrooms into the Stage store', () => {
    useClassroomBridgeStore.getState().loadClassroom(createNativeClassroom(), 'kn-native')

    const bridgeState = useClassroomBridgeStore.getState()
    const stageState = useStageStore.getState()

    expect(bridgeState.status).toBe('ready')
    expect(bridgeState.error).toBeNull()
    expect(stageState.stage?.id).toBe('native-stage-1')
    expect(stageState.scenes).toHaveLength(1)
    expect(stageState.outlines).toEqual([
      expect.objectContaining({
        id: 'outline-1',
        mediaGenerations: [
          expect.objectContaining({
            type: 'image',
            elementId: 'gen_img_intro_1',
          }),
        ],
      }),
    ])
    expect(stageState.scenes[0].actions).toHaveLength(1)
  })

  it('rejects legacy classrooms instead of injecting empty Stage scenes', () => {
    const bridgeStore = useClassroomBridgeStore.getState()

    bridgeStore.loadClassroom(createNativeClassroom(), 'kn-native')
    expect(useStageStore.getState().scenes).toHaveLength(1)

    bridgeStore.loadClassroom(createLegacyClassroom(), 'kn-legacy')

    const bridgeState = useClassroomBridgeStore.getState()
    const stageState = useStageStore.getState()

    expect(bridgeState.status).toBe('error')
    expect(bridgeState.error).toMatch(/旧版|legacy/i)
    expect(stageState.stage).toBeNull()
    expect(stageState.scenes).toEqual([])
    expect(stageState.currentSceneId).toBeNull()
  })
})
