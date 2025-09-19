'use client'

import { useEffect } from 'react'
import { Camera, Upload, Volume2, Languages } from 'lucide-react'
import Button from './Button'
import { useLanguage } from '@/lib/language-context'
import { useAudioHint } from '@/lib/tts'
import Link from 'next/link'

export default function HomePage() {
  const { language, setLanguage, t } = useLanguage()
  const { playHint } = useAudioHint()

  useEffect(() => {
    const timer = setTimeout(() => {
      playHint(t('audioHint'), language)
    }, 1500)

    return () => clearTimeout(timer)
  }, [language, playHint, t])

  const handleLanguageToggle = () => {
    const newLang = language === 'hi' ? 'en' : 'hi'
    setLanguage(newLang)
  }

  const playAudioHint = () => {
    playHint(t('audioHint'), language)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      <header className="bg-red-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div>
            <h1 className="text-2xl font-bold">LexiYaar</h1>
            <p className="text-sm opacity-90">Legal Document Scanner</p>
          </div>
          
          <button
            onClick={handleLanguageToggle}
            className="flex items-center gap-2 bg-red-700 hover:bg-red-800 px-3 py-2 rounded-lg transition-colors"
          >
            <Languages size={20} />
            <span className="text-sm font-medium">
              {language === 'hi' ? 'हिं' : 'EN'}
            </span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            {t('welcome')}
          </h2>
          <p className="text-gray-600 text-base leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <Link href="/scan?mode=camera" className="block">
            <Button
              size="xl"
              className="w-full h-20 text-lg flex items-center justify-center gap-4 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
            >
              <Camera size={32} />
              <div className="text-left">
                <div className="font-bold">{t('scanDocument')}</div>
                <div className="text-sm opacity-90">Take a photo</div>
              </div>
            </Button>
          </Link>

          <Link href="/scan?mode=upload" className="block">
            <Button
              size="xl"
              variant="outline"
              className="w-full h-20 text-lg flex items-center justify-center gap-4 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
            >
              <Upload size={32} />
              <div className="text-left">
                <div className="font-bold">{t('uploadPdf')}</div>
                <div className="text-sm opacity-90">Select from device</div>
              </div>
            </Button>
          </Link>
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={playAudioHint}
            className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-full text-sm font-medium transition-colors"
          >
            <Volume2 size={18} />
            Listen to instructions
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            {t('howItWorks')}
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 text-red-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                1
              </div>
              <p>Upload or scan your rental agreement document</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-yellow-100 text-yellow-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                2
              </div>
              <p>We&apos;ll extract text and identify risky clauses</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-green-100 text-green-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                3
              </div>
              <p>Get explanations in Hindi or English with audio</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800 text-center leading-relaxed">
            ⚠️ {t('disclaimer')}
          </p>
        </div>
      </main>
    </div>
  )
}