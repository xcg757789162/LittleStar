import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TTSService } from '../voice/tts'
import { STTService } from '../voice/stt'
import { WebSpeechFallback } from '../voice/web-speech-fallback'

describe('Voice Services', () => {
  describe('TTSService', () => {
    let tts: TTSService

    beforeEach(() => {
      tts = new TTSService({
        apiKey: 'test-key',
        baseUrl: 'https://test.api.com',
      })
    })

    it('应该能创建实例', () => {
      expect(tts).toBeDefined()
    })

    it('speak 应接受文本并返回 Promise', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      })

      const result = await tts.speak('你好')
      expect(result).toBeDefined()
    })

    it('API 失败时应返回错误', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))
      await expect(tts.speak('你好')).rejects.toThrow()
    })

    it('应支持语速控制', () => {
      tts.setSpeed(1.5)
      expect(tts.getSpeed()).toBe(1.5)
    })

    it('应支持音量控制', () => {
      tts.setVolume(0.8)
      expect(tts.getVolume()).toBe(0.8)
    })
  })

  describe('STTService', () => {
    let stt: STTService

    beforeEach(() => {
      stt = new STTService({
        apiKey: 'test-key',
        baseUrl: 'https://test.api.com',
      })
    })

    it('应该能创建实例', () => {
      expect(stt).toBeDefined()
    })

    it('recognize 应接受 Blob 并返回文本', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: '你好' }),
      })

      const blob = new Blob(['test'], { type: 'audio/wav' })
      const result = await stt.recognize(blob)
      expect(typeof result).toBe('string')
    })

    it('API 失败时应抛出错误', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))
      const blob = new Blob(['test'], { type: 'audio/wav' })
      await expect(stt.recognize(blob)).rejects.toThrow()
    })
  })

  describe('WebSpeechFallback', () => {
    it('应该能创建实例', () => {
      const fallback = new WebSpeechFallback()
      expect(fallback).toBeDefined()
    })

    it('isSupported 应返回布尔值', () => {
      const fallback = new WebSpeechFallback()
      expect(typeof fallback.isTTSSupported()).toBe('boolean')
      expect(typeof fallback.isSTTSupported()).toBe('boolean')
    })
  })
})
