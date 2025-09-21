'use client'

import { useEffect, useState } from 'react'
import { Camera, Upload, Volume2, Shield, Zap, Globe, Sparkles, FileText, CheckCircle } from 'lucide-react'
import Button from './Button'
import { useTranslation } from 'react-i18next';
import { useAudioHint } from '@/lib/tts'
import { Language } from '@/types';
// Map i18n.language to supported TTS Language type
function mapI18nToTTS(lang: string): Language {
  if (lang.startsWith('hi')) return 'hi';
  return 'en';
}
import Link from 'next/link'

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { playHint } = useAudioHint();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      playHint(t('audioHint'), mapI18nToTTS(i18n.language));
    }, 1500);
    return () => clearTimeout(timer);
  }, [i18n.language, playHint, t]);

  const playAudioHint = () => {
    playHint(t('audioHint'), mapI18nToTTS(i18n.language));
  };

  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-br from-red-50 via-orange-50 to-pink-50 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}> 
      {/* Modern Sticky Header with Safe Area */}
      <header className="sticky top-0 z-30 w-full bg-gradient-to-r from-red-600 to-red-700 text-white shadow-xl backdrop-blur-md" style={{ WebkitBackdropFilter: 'blur(8px)' }}>
        <div className="relative flex flex-col px-4 pt-[env(safe-area-inset-top)] pb-4 sm:py-4">
          <div className="flex items-center gap-3 mb-1 mt-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                <Shield size={24} className="text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">LexiYaar</h1>
            </div>
          </div>
          <p className="text-red-100 text-base sm:text-lg font-medium text-center px-2 mt-1">{t('subtitle')}</p>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-2 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
        {/* Welcome Section with Animation */}
        <div className={`text-center mb-8 sm:mb-12 transform transition-all duration-700 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-3">
            <Sparkles size={16} />
            <span>{t('aiPoweredLegalAnalysis')}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            {t('welcome')}
          </h2>
          <p className="text-base sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Action Buttons with Modern Design */}
  <div className={`grid md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12 transform transition-all duration-700 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <Link href="/scan?mode=camera" className="block group">
            <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02] border border-red-100">
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl text-white group-hover:scale-110 transition-transform duration-300">
                  <Camera size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-red-600 transition-colors">
                    {t('scanDocument')}
                  </h3>
                  <p className="text-gray-500">{t('takePhotoHint')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-red-600 font-medium text-sm">
                <span>{t('startScanning')}</span>
                <div className="w-2 h-2 bg-red-600 rounded-full group-hover:animate-pulse"></div>
              </div>
            </div>
          </Link>

          <Link href="/scan?mode=upload" className="block group">
            <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02] border border-orange-100">
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white group-hover:scale-110 transition-transform duration-300">
                  <Upload size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-orange-600 transition-colors">
                    {t('uploadPdf')}
                  </h3>
                  <p className="text-gray-500">{t('uploadPdfHint')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-orange-600 font-medium text-sm">
                <span>{t('chooseFile')}</span>
                <div className="w-2 h-2 bg-orange-600 rounded-full group-hover:animate-pulse"></div>
              </div>
            </div>
          </Link>
        </div>

        {/* Audio Hint Button */}
  <div className={`flex justify-center mb-8 sm:mb-12 transform transition-all duration-700 delay-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <Button
            onClick={playAudioHint}
            variant="glass"
            className="bg-blue-100/80 text-blue-700 hover:bg-blue-200/80 border-blue-200 px-4 py-2 rounded-lg shadow"
            size="lg"
          >
            <Volume2 size={20} className="mr-2" />
            {t('listenToInstructions')}
          </Button>
        </div>

        {/* Features Grid */}
  <div className={`grid md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12 transform transition-all duration-700 delay-900 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="text-red-600" size={24} />
            </div>
            <h4 className="font-semibold text-gray-800 mb-2">{t('smartOcr')}</h4>
            <p className="text-sm text-gray-600">{t('smartOcrDesc')}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="text-orange-600" size={24} />
            </div>
            <h4 className="font-semibold text-gray-800 mb-2">{t('aiAnalysis')}</h4>
            <p className="text-sm text-gray-600">{t('aiAnalysisDesc')}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="text-green-600" size={24} />
            </div>
            <h4 className="font-semibold text-gray-800 mb-2">{t('multiLanguage')}</h4>
            <p className="text-sm text-gray-600">{t('multiLanguageDesc')}</p>
          </div>
        </div>

        {/* How It Works */}
  <div className={`bg-white rounded-2xl p-5 sm:p-8 shadow-xl mb-6 sm:mb-8 transform transition-all duration-700 delay-1100 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 text-center flex items-center justify-center gap-2">
            <Sparkles className="text-red-600" size={24} />
            {t('howItWorks')}
          </h3>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center flex flex-col items-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-2 sm:mb-4 text-white font-bold text-lg sm:text-xl">
                1
              </div>
              <h4 className="font-semibold text-gray-800 mb-1 sm:mb-2">{t('step1Title')}</h4>
              <p className="text-gray-600 text-xs sm:text-sm">{t('step1Desc')}</p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-2 sm:mb-4 text-white font-bold text-lg sm:text-xl">
                2
              </div>
              <h4 className="font-semibold text-gray-800 mb-1 sm:mb-2">{t('step2Title')}</h4>
              <p className="text-gray-600 text-xs sm:text-sm">{t('step2Desc')}</p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-2 sm:mb-4 text-white font-bold text-lg sm:text-xl">
                3
              </div>
              <h4 className="font-semibold text-gray-800 mb-1 sm:mb-2">{t('step3Title')}</h4>
              <p className="text-gray-600 text-xs sm:text-sm">{t('step3Desc')}</p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
  <div className={`bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4 sm:p-6 transform transition-all duration-700 delay-1300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mt-0.5">
              <CheckCircle size={14} className="text-yellow-600" />
            </div>
            <p className="text-xs sm:text-sm text-yellow-800 leading-relaxed">
              <strong>Important:</strong> {t('disclaimer')}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}