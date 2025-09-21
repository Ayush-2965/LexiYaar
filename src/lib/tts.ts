'use client'


import { Language } from '@/types';
import { Capacitor } from '@capacitor/core';


import type { TTSOptions as NativeTTSOptions } from '@capacitor-community/text-to-speech';

interface NativeTTS {
  speak: (options: NativeTTSOptions) => Promise<void>;
}
interface TTSOptions {
  lang: Language;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export class TTSService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isNative = false;
  private nativeTTS: unknown = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      // Detect Capacitor/Native
      try {
        this.isNative = Capacitor.isNativePlatform && Capacitor.isNativePlatform();
      } catch {
        this.isNative = false;
      }
      if (this.isNative) {
        import('@capacitor-community/text-to-speech').then(mod => {
          this.nativeTTS = mod.TextToSpeech;
        }).catch(() => {
          this.nativeTTS = null;
        });
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    if (this.voices.length === 0) {
      this.synth.addEventListener('voiceschanged', () => {
        this.voices = this.synth!.getVoices();
      });
    }
  }

  private getVoice(lang: Language): SpeechSynthesisVoice | null {
    const langMap = {
      hi: ['hi-IN', 'hi'],
      en: ['en-IN', 'en-US', 'en-GB', 'en']
    };
    const preferredLangs = langMap[lang];
    for (const preferredLang of preferredLangs) {
      const voice = this.voices.find(v => v.lang.startsWith(preferredLang));
      if (voice) return voice;
    }
    return this.voices[0] || null;
  }

  async speak(text: string, options: TTSOptions = { lang: 'en' }): Promise<void> {
    if (this.isNative && this.nativeTTS && typeof (this.nativeTTS as NativeTTS).speak === 'function') {
      const langCode = options.lang === 'hi' ? 'hi-IN' : 'en-US';
      await (this.nativeTTS as NativeTTS).speak({
        text,
        lang: langCode,
        rate: options.rate || 1.0,
        pitch: options.pitch || 1.0,
        volume: options.volume || 1.0,
        category: 'ambient',
      });
      return;
    }
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }
      this.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = this.getVoice(options.lang);
      if (voice) utterance.voice = voice;
      utterance.lang = options.lang === 'hi' ? 'hi-IN' : 'en-US';
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event.error);
      this.synth.speak(utterance);
    });
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }
}

// Create singleton instance
export const ttsService = new TTSService();

// Audio hint hook
export function useAudioHint() {
  const playHint = async (text: string, lang: Language = 'en') => {
    try {
      await ttsService.speak(text, { lang, rate: 0.8 });
    } catch (error) {
      console.warn('TTS not available:', error);
    }
  };
  return { playHint };
}