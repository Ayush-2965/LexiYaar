'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Language } from '@/types'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations = {
  hi: {
    // Home page
    welcome: "नमस्ते! LexiYaar में आपका स्वागत है",
    subtitle: "कानूनी दस्तावेजों को स्कैन करें और जोखिम भरी खंडों की पहचान करें",
    scanDocument: "दस्तावेज स्कैन करें",
    uploadPdf: "PDF अपलोड करें",
    howItWorks: "यह कैसे काम करता है?",
    audioHint: "बड़े बटनों पर टैप करें। हम आपके कानूनी दस्तावेजों की जांच करते हैं।",
    
    // Navigation
    home: "होम",
    scan: "स्कैन",
    help: "सहायता", 
    settings: "सेटिंग्स",
    
    // Common
    loading: "लोड हो रहा है...",
    error: "त्रुटि",
    cancel: "रद्द करें",
    save: "सेव करें",
    
    // Disclaimer
    disclaimer: "यह कानूनी सलाह नहीं है। पेशेवर सलाह के लिए वकील से संपर्क करें।",
  },
  en: {
    // Home page
    welcome: "Welcome to LexiYaar!",
    subtitle: "Scan legal documents and identify risky clauses",
    scanDocument: "Scan Document",
    uploadPdf: "Upload PDF", 
    howItWorks: "How it works?",
    audioHint: "Tap the large buttons. We'll check your legal documents for risks.",
    
    // Navigation
    home: "Home",
    scan: "Scan", 
    help: "Help",
    settings: "Settings",
    
    // Common
    loading: "Loading...",
    error: "Error",
    cancel: "Cancel",
    save: "Save",
    
    // Disclaimer
    disclaimer: "This is not legal advice. Consult a lawyer for professional guidance.",
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    const savedLang = localStorage.getItem('lexiyaar-language') as Language
    if (savedLang && ['hi', 'en'].includes(savedLang)) {
      setLanguage(savedLang)
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('lexiyaar-language', lang)
  }

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key
  }

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage: handleSetLanguage,
      t
    }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}