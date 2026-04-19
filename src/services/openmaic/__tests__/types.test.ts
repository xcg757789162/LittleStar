import { describe, it, expect } from 'vitest'
import {
  type Classroom,
  type Scene,
  type Slide,
  type SlideType,
  type ClassroomStatus,
  type QuizData,
  type GenerateClassroomRequest,
  type GenerateClassroomResponse,
  type ClassroomStatusResponse,
  isClassroom,
  isScene,
  isSlide,
  isQuizData,
  SLIDE_TYPES,
  CLASSROOM_STATUSES,
} from '../types'

describe('OpenMAIC Types', () => {
  describe('SlideType constants', () => {
    it('should export all slide type values', () => {
      expect(SLIDE_TYPES).toContain('title')
      expect(SLIDE_TYPES).toContain('content')
      expect(SLIDE_TYPES).toContain('image')
      expect(SLIDE_TYPES).toContain('quiz')
      expect(SLIDE_TYPES).toContain('tpr')
      expect(SLIDE_TYPES).toContain('audio')
    })
  })

  describe('ClassroomStatus constants', () => {
    it('should export all classroom status values', () => {
      expect(CLASSROOM_STATUSES).toContain('pending')
      expect(CLASSROOM_STATUSES).toContain('processing')
      expect(CLASSROOM_STATUSES).toContain('completed')
      expect(CLASSROOM_STATUSES).toContain('failed')
    })
  })

  describe('isQuizData type guard', () => {
    it('should return true for valid quiz data', () => {
      const validQuiz: QuizData = {
        question: 'What is 2 + 3?',
        options: ['4', '5', '6'],
        correctAnswer: 1,
      }
      expect(isQuizData(validQuiz)).toBe(true)
    })

    it('should return true for quiz data with optional imageUrl', () => {
      const quizWithImage: QuizData = {
        question: 'Which animal says "Woof"?',
        options: ['Cat', 'Dog', 'Bird'],
        correctAnswer: 1,
        imageUrl: 'https://example.com/dog.png',
      }
      expect(isQuizData(quizWithImage)).toBe(true)
    })

    it('should return false for invalid quiz data', () => {
      expect(isQuizData(null)).toBe(false)
      expect(isQuizData(undefined)).toBe(false)
      expect(isQuizData({})).toBe(false)
      expect(isQuizData({ question: 'test' })).toBe(false)
      expect(isQuizData({ question: 'test', options: 'not-array' })).toBe(false)
      expect(isQuizData({ question: 'test', options: [], correctAnswer: 'not-number' })).toBe(false)
    })
  })

  describe('isSlide type guard', () => {
    it('should return true for a valid content slide', () => {
      const slide: Slide = {
        type: 'content',
        title: 'Counting 1-5',
        content: 'Let us learn to count!',
      }
      expect(isSlide(slide)).toBe(true)
    })

    it('should return true for a valid image slide', () => {
      const slide: Slide = {
        type: 'image',
        title: 'Look at this!',
        imageUrl: 'https://example.com/image.png',
      }
      expect(isSlide(slide)).toBe(true)
    })

    it('should return true for a valid quiz slide', () => {
      const slide: Slide = {
        type: 'quiz',
        quiz: {
          question: 'What is 1 + 1?',
          options: ['1', '2', '3'],
          correctAnswer: 1,
        },
      }
      expect(isSlide(slide)).toBe(true)
    })

    it('should return true for a slide with all optional fields', () => {
      const slide: Slide = {
        type: 'content',
        title: 'Hello Animals',
        content: 'Let us meet the animals!',
        imageUrl: 'https://example.com/animals.png',
        audioUrl: 'https://example.com/audio.mp3',
        tprInstruction: 'Wave your hands!',
        onomatopoeia: 'Woof, woof!',
        animation: 'bounce',
        quiz: {
          question: 'Which one?',
          options: ['A', 'B'],
          correctAnswer: 0,
        },
      }
      expect(isSlide(slide)).toBe(true)
    })

    it('should return false for invalid slide data', () => {
      expect(isSlide(null)).toBe(false)
      expect(isSlide(undefined)).toBe(false)
      expect(isSlide({})).toBe(false)
      expect(isSlide({ type: 'invalid-type' })).toBe(false)
    })
  })

  describe('isScene type guard', () => {
    it('should return true for a valid scene', () => {
      const scene: Scene = {
        id: 'scene-1',
        title: 'Introduction',
        type: 'teaching',
        slides: [
          {
            type: 'content',
            title: 'Welcome',
            content: 'Hello students!',
          },
        ],
      }
      expect(isScene(scene)).toBe(true)
    })

    it('should return false for invalid scene data', () => {
      expect(isScene(null)).toBe(false)
      expect(isScene(undefined)).toBe(false)
      expect(isScene({})).toBe(false)
      expect(isScene({ id: 'test' })).toBe(false)
      // v2/v1 容错：有合法 id、title、type 时即使没有 slides/content 也视为有效 Scene
      expect(isScene({ id: 'test', title: 'Test', type: 'teaching' })).toBe(true)
      expect(isScene({ id: 'test', title: 'Test', type: 'teaching', slides: 'not-array' })).toBe(false)
      expect(isScene({ id: 'test', title: 'Test', type: 'not-a-real-scene-type' })).toBe(false)
    })
  })

  describe('isClassroom type guard', () => {
    it('should return true for a valid classroom', () => {
      const classroom: Classroom = {
        id: 'classroom-1',
        title: 'Learn Numbers 1-5',
        status: 'completed',
        scenes: [
          {
            id: 'scene-1',
            title: 'Counting Fun',
            type: 'teaching',
            slides: [
              {
                type: 'content',
                title: 'One, Two, Three!',
                content: 'Let us count together!',
              },
            ],
          },
        ],
      }
      expect(isClassroom(classroom)).toBe(true)
    })

    it('should return true for a classroom with optional fields', () => {
      const classroom: Classroom = {
        id: 'classroom-2',
        title: 'Animals',
        status: 'completed',
        scenes: [],
        description: 'Learn about animals',
        createdAt: '2026-04-08T12:00:00Z',
        language: 'zh-CN',
      }
      expect(isClassroom(classroom)).toBe(true)
    })

    it('should return false for invalid classroom data', () => {
      expect(isClassroom(null)).toBe(false)
      expect(isClassroom(undefined)).toBe(false)
      expect(isClassroom({})).toBe(false)
      expect(isClassroom({ id: 'test' })).toBe(false)
      expect(isClassroom({ id: 'test', title: 'Test', status: 'completed' })).toBe(false) // missing scenes
      expect(isClassroom({ id: 'test', title: 'Test', status: 'invalid', scenes: [] })).toBe(false) // invalid status
    })
  })

  describe('Type structure validation', () => {
    it('should allow GenerateClassroomRequest to have requirement field', () => {
      const request: GenerateClassroomRequest = {
        requirement: 'Teach counting numbers 1-5 to a 5 year old child',
      }
      expect(request.requirement).toBeDefined()
      expect(typeof request.requirement).toBe('string')
    })

    it('should allow GenerateClassroomRequest with optional fields', () => {
      const request: GenerateClassroomRequest = {
        requirement: 'Teach animals',
        language: 'zh-CN',
        model: 'openai:qwen-plus',
      }
      expect(request.language).toBe('zh-CN')
      expect(request.model).toBe('openai:qwen-plus')
    })

    it('should allow GenerateClassroomResponse with classroomId', () => {
      const response: GenerateClassroomResponse = {
        classroomId: 'abc-123',
        status: 'pending',
      }
      expect(response.classroomId).toBeDefined()
      expect(response.status).toBe('pending')
    })

    it('should allow ClassroomStatusResponse with status and optional classroom', () => {
      const pendingResponse: ClassroomStatusResponse = {
        status: 'processing',
        progress: 0.5,
      }
      expect(pendingResponse.status).toBe('processing')

      const completedResponse: ClassroomStatusResponse = {
        status: 'completed',
        classroom: {
          id: 'classroom-1',
          title: 'Test',
          status: 'completed',
          scenes: [],
        },
      }
      expect(completedResponse.classroom).toBeDefined()
    })
  })
})
