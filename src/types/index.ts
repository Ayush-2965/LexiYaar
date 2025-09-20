// Language types
export type Language = 'hi' | 'en'

// Document types
export interface DocumentData {
  id: string
  image: string
  extractedText: string
  processedAt: Date
  filename?: string
}

// Clause classification types
export interface ClauseResult {
  id: string
  text: string
  type: ClauseType
  confidence: number
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  riskLevel: RiskLevel
  reason: string
  legalBasis?: string // Legal regulation violated
  suggestion?: string // How to improve the clause
}

export type ClauseType = 
  | 'security_deposit' 
  | 'rent_hike' 
  | 'lock_in_penalty'
  | 'other'

export type RiskLevel = 'low' | 'medium' | 'high'

// Audio explanation types
export interface AudioExplanation {
  whatItMeans: {
    hi: string
    en: string
  }
  whatLawSays: {
    hi: string
    en: string
  }
}

// Legal contact types
export interface LegalContact {
  id: string
  name: string
  type: 'DLSA' | 'Legal Aid'
  phone: string
  address: string
  location: {
    lat: number
    lng: number
  }
  city: string
  state: string
}

// OCR types
export interface OCRResult {
  text: string
  confidence: number
  bbox?: {
    x0: number
    y0: number
    x1: number
    y1: number
  }
}

// Government type for AI analysis
export type GovernmentType = 'india' | 'us' | 'general'

// Legal analysis result from AI
export interface LegalAnalysisResult {
  clauses: ClauseResult[]
  overallRiskScore: number
  governmentCompliance: {
    compliant: boolean
    violations: string[]
    recommendations: string[]
  }
  summary: string
}

// App state types
export interface AppSettings {
  language: Language
  enableFirebaseUpload: boolean
  enableGeolocation: boolean
  governmentType: GovernmentType
}
