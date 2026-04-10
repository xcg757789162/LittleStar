/**
 * Pipeline Types 测试
 *
 * 测试 pipeline-types.ts 中定义的所有类型的结构正确性。
 * 使用类型断言和运行时守卫验证类型定义是否与 OpenMAIC 子 API 参数对齐。
 */
import { describe, it, expect } from 'vitest'
import type {
  UserRequirements,
  SceneOutline,
  GeneratedContent,
  SceneAction,
  AgentInfo,
  TTSConfig,
  PipelineInput,
  PipelineCallbacks,
  PipelineProgress,
  PipelineStepName,
} from '../pipeline-types'
import {
  PIPELINE_STEP_NAMES,
  isPipelineProgress,
  isSceneOutline,
} from '../pipeline-types'

describe('Pipeline Types', () => {
  describe('PIPELINE_STEP_NAMES constant', () => {
    it('should contain all pipeline step names', () => {
      expect(PIPELINE_STEP_NAMES).toContain('outlines')
      expect(PIPELINE_STEP_NAMES).toContain('scene-content')
      expect(PIPELINE_STEP_NAMES).toContain('scene-actions')
      expect(PIPELINE_STEP_NAMES).toContain('tts')
      expect(PIPELINE_STEP_NAMES).toContain('assembly')
      expect(PIPELINE_STEP_NAMES).toContain('agent-profiles')
    })

    it('should have exactly 6 steps', () => {
      expect(PIPELINE_STEP_NAMES).toHaveLength(6)
    })
  })

  describe('UserRequirements type structure', () => {
    it('should accept a valid UserRequirements object with required fields', () => {
      const req: UserRequirements = {
        requirement: 'Teach colors: red, blue, green for 5-year-old children',
        language: 'en',
      }
      expect(req.requirement).toBe('Teach colors: red, blue, green for 5-year-old children')
      expect(req.language).toBe('en')
    })

    it('should accept UserRequirements with optional fields', () => {
      const req: UserRequirements = {
        requirement: 'Teach animals',
        language: 'zh-CN',
        userNickname: '小明',
        userBio: '我今年5岁，喜欢画画和小动物',
      }
      expect(req.userNickname).toBe('小明')
      expect(req.userBio).toBe('我今年5岁，喜欢画画和小动物')
    })
  })

  describe('SceneOutline type structure', () => {
    it('should accept a valid SceneOutline', () => {
      const outline: SceneOutline = {
        index: 0,
        title: 'Introduction to Colors',
        description: 'Introduce the three primary colors',
        type: 'teaching',
      }
      expect(outline.index).toBe(0)
      expect(outline.title).toBe('Introduction to Colors')
      expect(outline.description).toBe('Introduce the three primary colors')
      expect(outline.type).toBe('teaching')
    })

    it('should accept SceneOutline with optional type', () => {
      const outline: SceneOutline = {
        index: 1,
        title: 'Color Quiz',
        description: 'Test knowledge of colors',
      }
      expect(outline.type).toBeUndefined()
    })
  })

  describe('isSceneOutline type guard', () => {
    it('should return true for valid outline', () => {
      expect(isSceneOutline({
        index: 0,
        title: 'Test',
        description: 'Test desc',
      })).toBe(true)
    })

    it('should return false for invalid data', () => {
      expect(isSceneOutline(null)).toBe(false)
      expect(isSceneOutline(undefined)).toBe(false)
      expect(isSceneOutline({})).toBe(false)
      expect(isSceneOutline({ index: 'not-number' })).toBe(false)
      expect(isSceneOutline({ index: 0, title: 123 })).toBe(false)
    })
  })

  describe('GeneratedContent type structure', () => {
    it('should accept valid GeneratedContent with canvas', () => {
      const content: GeneratedContent = {
        type: 'slide',
        canvas: {
          elements: [
            { type: 'text', content: '<h1>Colors</h1>' },
            { type: 'image', src: 'https://example.com/red.png' },
          ],
        },
      }
      expect(content.type).toBe('slide')
      expect(content.canvas?.elements).toHaveLength(2)
    })

    it('should accept GeneratedContent with quiz questions', () => {
      const content: GeneratedContent = {
        type: 'quiz',
        questions: [
          {
            question: 'What color is the sky?',
            options: [
              { value: 'A', label: 'Red' },
              { value: 'B', label: 'Blue' },
            ],
            answer: ['B'],
          },
        ],
      }
      expect(content.type).toBe('quiz')
      expect(content.questions).toHaveLength(1)
    })
  })

  describe('SceneAction type structure', () => {
    it('should accept a speech action', () => {
      const action: SceneAction = {
        type: 'speech',
        text: 'Hello children! Today we will learn about colors.',
      }
      expect(action.type).toBe('speech')
      expect(action.text).toBe('Hello children! Today we will learn about colors.')
    })

    it('should accept a speech action with audio data', () => {
      const action: SceneAction = {
        type: 'speech',
        text: 'This is red!',
        audioBase64: 'base64encodedaudiodata...',
        audioDurationMs: 2500,
      }
      expect(action.audioBase64).toBeDefined()
      expect(action.audioDurationMs).toBe(2500)
    })

    it('should accept a spotlight action', () => {
      const action: SceneAction = {
        type: 'spotlight',
        targetElementId: 'element-1',
      }
      expect(action.type).toBe('spotlight')
      expect(action.targetElementId).toBe('element-1')
    })
  })

  describe('AgentInfo type structure', () => {
    it('should accept valid AgentInfo', () => {
      const agent: AgentInfo = {
        name: 'Teacher Luna',
        personality: 'Friendly and patient',
        avatar: 'luna-avatar.png',
      }
      expect(agent.name).toBe('Teacher Luna')
      expect(agent.personality).toBe('Friendly and patient')
    })

    it('should accept AgentInfo with optional fields', () => {
      const agent: AgentInfo = {
        name: 'Teacher',
      }
      expect(agent.personality).toBeUndefined()
      expect(agent.avatar).toBeUndefined()
    })
  })

  describe('TTSConfig type structure', () => {
    it('should accept valid TTSConfig', () => {
      const config: TTSConfig = {
        providerId: 'volcengine',
        voiceId: 'zh_female_01',
        speed: 0.9,
        pitch: 1.0,
      }
      expect(config.providerId).toBe('volcengine')
      expect(config.voiceId).toBe('zh_female_01')
      expect(config.speed).toBe(0.9)
    })

    it('should accept TTSConfig with only required fields', () => {
      const config: TTSConfig = {
        providerId: 'azure',
        voiceId: 'en-US-JennyNeural',
      }
      expect(config.speed).toBeUndefined()
      expect(config.pitch).toBeUndefined()
    })
  })

  describe('PipelineInput type structure', () => {
    it('should accept valid PipelineInput with all fields', () => {
      const input: PipelineInput = {
        requirements: {
          requirement: 'Teach colors',
          language: 'en',
          userNickname: 'Tommy',
        },
        headers: {
          'x-model': 'openai:gpt-4o',
          'x-api-key': 'sk-test-key',
        },
        callbacks: {
          onProgress: (_progress: PipelineProgress) => {},
          onOutlinesReady: (_outlines: SceneOutline[]) => {},
        },
      }
      expect(input.requirements.requirement).toBe('Teach colors')
      expect(input.headers['x-model']).toBe('openai:gpt-4o')
      expect(input.callbacks).toBeDefined()
    })

    it('should accept PipelineInput without optional callbacks', () => {
      const input: PipelineInput = {
        requirements: {
          requirement: 'Teach numbers',
          language: 'zh-CN',
        },
        headers: {},
      }
      expect(input.callbacks).toBeUndefined()
    })
  })

  describe('PipelineProgress type structure', () => {
    it('should accept valid PipelineProgress', () => {
      const progress: PipelineProgress = {
        step: 'outlines',
        percent: 25,
        message: 'Generating scene outlines...',
        sceneIndex: undefined,
        totalScenes: undefined,
      }
      expect(progress.step).toBe('outlines')
      expect(progress.percent).toBe(25)
      expect(progress.message).toBe('Generating scene outlines...')
    })

    it('should accept PipelineProgress with scene info', () => {
      const progress: PipelineProgress = {
        step: 'scene-content',
        percent: 50,
        message: 'Generating content for scene 2/4',
        sceneIndex: 1,
        totalScenes: 4,
      }
      expect(progress.sceneIndex).toBe(1)
      expect(progress.totalScenes).toBe(4)
    })
  })

  describe('isPipelineProgress type guard', () => {
    it('should return true for valid progress', () => {
      expect(isPipelineProgress({
        step: 'outlines',
        percent: 10,
        message: 'Starting...',
      })).toBe(true)
    })

    it('should return true for progress with scene info', () => {
      expect(isPipelineProgress({
        step: 'tts',
        percent: 80,
        message: 'Generating TTS...',
        sceneIndex: 2,
        totalScenes: 5,
      })).toBe(true)
    })

    it('should return false for invalid data', () => {
      expect(isPipelineProgress(null)).toBe(false)
      expect(isPipelineProgress(undefined)).toBe(false)
      expect(isPipelineProgress({})).toBe(false)
      expect(isPipelineProgress({ step: 'invalid-step', percent: 10 })).toBe(false)
      expect(isPipelineProgress({ step: 'outlines', percent: 'not-number' })).toBe(false)
    })
  })

  describe('PipelineCallbacks type structure', () => {
    it('should accept callbacks with all optional functions', () => {
      const callbacks: PipelineCallbacks = {
        onProgress: (_progress: PipelineProgress) => {},
        onOutlinesReady: (_outlines: SceneOutline[]) => {},
        onSceneContentReady: (_sceneIndex: number, _content: GeneratedContent) => {},
        onSceneActionsReady: (_sceneIndex: number, _actions: SceneAction[]) => {},
        onTTSReady: (_sceneIndex: number, _actionIndex: number, _audioBase64: string) => {},
        onError: (_step: PipelineStepName, _error: Error) => {},
      }
      expect(typeof callbacks.onProgress).toBe('function')
      expect(typeof callbacks.onOutlinesReady).toBe('function')
      expect(typeof callbacks.onSceneContentReady).toBe('function')
      expect(typeof callbacks.onSceneActionsReady).toBe('function')
      expect(typeof callbacks.onTTSReady).toBe('function')
      expect(typeof callbacks.onError).toBe('function')
    })

    it('should accept empty callbacks (all optional)', () => {
      const callbacks: PipelineCallbacks = {}
      expect(callbacks.onProgress).toBeUndefined()
    })
  })

  describe('PipelineStepName type', () => {
    it('should allow all valid step names', () => {
      const steps: PipelineStepName[] = [
        'outlines',
        'scene-content',
        'scene-actions',
        'tts',
        'assembly',
      ]
      steps.forEach((step) => {
        expect(PIPELINE_STEP_NAMES).toContain(step)
      })
    })
  })
})
