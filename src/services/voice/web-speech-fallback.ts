/**
 * Web Speech API 降级
 * 网络不可用时使用浏览器原生 TTS/STT
 */

export class WebSpeechFallback {
  isTTSSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  isSTTSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    )
  }

  async speak(text: string, lang = 'zh-CN'): Promise<void> {
    if (!this.isTTSSupported()) {
      throw new Error('Web Speech TTS not supported')
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = 0.9
      utterance.pitch = 1.1
      utterance.onend = () => resolve()
      utterance.onerror = (e) => reject(new Error(`TTS Error: ${e.error}`))
      speechSynthesis.speak(utterance)
    })
  }
}
