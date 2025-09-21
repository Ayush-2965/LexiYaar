import { Capacitor } from '@capacitor/core';
import { Translation, Language, TranslateOptions } from '@capacitor-mlkit/translation';

export interface TranslationOptions {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
}

export class TranslationService {
  private static instance: TranslationService;
  private availableLanguages: Set<string> = new Set();

  // Map string language codes to ML Kit Language enum
  private languageMap: Record<string, Language> = {
    'af': Language.Afrikaans,
    'ar': Language.Arabic,
    'be': Language.Belarusian,
    'bg': Language.Bulgarian,
    'bn': Language.Bengali,
    'ca': Language.Catalan,
    'cs': Language.Czech,
    'cy': Language.Welsh,
    'da': Language.Danish,
    'de': Language.German,
    'el': Language.Greek,
    'en': Language.English,
    'eo': Language.Esperanto,
    'es': Language.Spanish,
    'et': Language.Estonian,
    'fa': Language.Persian,
    'fi': Language.Finnish,
    'fr': Language.French,
    'ga': Language.Irish,
    'gl': Language.Galician,
    'gu': Language.Gujarati,
    'he': Language.Hebrew,
    'hi': Language.Hindi,
    'hr': Language.Croatian,
    'ht': Language.Haitian,
    'hu': Language.Hungarian,
    'id': Language.Indonesian,
    'is': Language.Icelandic,
    'it': Language.Italian,
    'ja': Language.Japanese,
    'ka': Language.Georgian,
    'kn': Language.Kannada,
    'ko': Language.Korean,
    // Add more mappings as needed
  };

  private constructor() {
    // Initialize available languages
    this.initializeAvailableLanguages();
  }

  static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  private async initializeAvailableLanguages() {
    if (Capacitor.isNativePlatform()) {
      try {
        // Get available languages from ML Kit
        const result = await Translation.getDownloadedModels();
        result.languages.forEach(lang => this.availableLanguages.add(lang));
      } catch (error) {
        console.warn('Failed to get available translation languages:', error);
      }
    }
  }

  private getMLKitLanguage(langCode: string): Language | null {
    return this.languageMap[langCode] || null;
  }

  async translate(options: TranslationOptions): Promise<string> {
    const { text, sourceLanguage, targetLanguage } = options;

    // If on web or translation not available, return original text
    if (!Capacitor.isNativePlatform()) {
      console.log('Translation not available on web, returning original text');
      return text;
    }

    const targetLang = this.getMLKitLanguage(targetLanguage);
    if (!targetLang) {
      console.warn(`Unsupported target language: ${targetLanguage}`);
      return text;
    }

    try {
      // Check if target language model is downloaded
      if (!this.availableLanguages.has(targetLang)) {
        console.log(`Downloading translation model for ${targetLanguage}`);
        await Translation.downloadModel({ language: targetLang });
        this.availableLanguages.add(targetLang);
      }

      const translateOptions: Partial<TranslateOptions> = {
        text,
        targetLanguage: targetLang,
      };

      if (sourceLanguage) {
        const sourceLang = this.getMLKitLanguage(sourceLanguage);
        if (sourceLang) {
          translateOptions.sourceLanguage = sourceLang;
        }
      }

      const result = await Translation.translate(translateOptions as TranslateOptions);

      return result.text;
    } catch (error) {
      console.error('Translation failed:', error);
      // Fallback to original text
      return text;
    }
  }

  async translateBatch(texts: string[], targetLanguage: string, sourceLanguage?: string): Promise<string[]> {
    const promises = texts.map(text =>
      this.translate({ text, sourceLanguage, targetLanguage })
    );
    return Promise.all(promises);
  }

  isLanguageAvailable(language: string): boolean {
    const lang = this.getMLKitLanguage(language);
    return lang ? this.availableLanguages.has(lang) : false;
  }

  async ensureLanguageModel(language: string): Promise<void> {
    const lang = this.getMLKitLanguage(language);
    if (lang && !this.availableLanguages.has(lang) && Capacitor.isNativePlatform()) {
      try {
        await Translation.downloadModel({ language: lang });
        this.availableLanguages.add(lang);
      } catch (error) {
        console.error(`Failed to download language model for ${language}:`, error);
      }
    }
  }
}

export const translationService = TranslationService.getInstance();