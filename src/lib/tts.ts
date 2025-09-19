'use client'

import { Language } from '@/types'

interface TTSOptions {
  lang: Language
  rate?: number
  pitch?: number
  volume?: number
}

export class TTSService {
  private synth: SpeechSynthesis | null = null
  private voices: SpeechSynthesisVoice[] = []

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis
      this.loadVoices()
    }
  }

  private loadVoices() {
    if (!this.synth) return

    // Load voices
    this.voices = this.synth.getVoices()

    // If voices are not loaded yet, wait for the voiceschanged event
    if (this.voices.length === 0) {
      this.synth.addEventListener('voiceschanged', () => {
        this.voices = this.synth!.getVoices()
      })
    }
  }

  private getVoice(lang: Language): SpeechSynthesisVoice | null {
    const langMap = {
      hi: ['hi-IN', 'hi'],
      en: ['en-IN', 'en-US', 'en-GB', 'en']
    }

    const preferredLangs = langMap[lang]

    // Find best matching voice
    for (const preferredLang of preferredLangs) {
      const voice = this.voices.find(v => v.lang.startsWith(preferredLang))
      if (voice) return voice
    }

    // Fallback to any available voice
    return this.voices[0] || null
  }

  speak(text: string, options: TTSOptions = { lang: 'en' }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis not supported'))
        return
      }

      // Cancel any ongoing speech
      this.synth.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      const voice = this.getVoice(options.lang)

      if (voice) {
        utterance.voice = voice
      }

      // Set language fallback
      utterance.lang = options.lang === 'hi' ? 'hi-IN' : 'en-US'
      
      // Set speech parameters
      utterance.rate = options.rate || 0.9
      utterance.pitch = options.pitch || 1
      utterance.volume = options.volume || 1

      utterance.onend = () => resolve()
      utterance.onerror = (event) => reject(event.error)

      this.synth.speak(utterance)
    })
  }

  stop() {
    if (this.synth) {
      this.synth.cancel()
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices
  }
}

// Create singleton instance
export const ttsService = new TTSService()

// Audio hint hook
export function useAudioHint() {
  const playHint = async (text: string, lang: Language = 'en') => {
    try {
      await ttsService.speak(text, { lang, rate: 0.8 })
    } catch (error) {
      console.warn('TTS not available:', error)
    }
  }

  return { playHint }
}