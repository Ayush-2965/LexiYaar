'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Volume2, VolumeX, AlertCircle, CheckCircle, AlertTriangle, Download, ChevronUp, ChevronDown, Sparkles, Brain, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next';
import { clauseClassifier } from '@/lib/classifier'
import { geminiAnalyzer } from '@/lib/gemini-ai'
import { ttsService } from '@/lib/tts'
import { ClauseResult, RiskLevel, ClauseType } from '@/types'
import { formatDate } from '@/lib/utils'
import { translationService } from '@/lib/translation'


interface DocumentPage {
  image: string
  extractedText: string
  paragraphs: string[]
  confidence: number
  pageNumber: number
}

interface DocumentData {
  pages: DocumentPage[]
  filename: string
  processedAt: string
  totalPages: number
}

interface BottomSheetProps {
  clause: ClauseResult | null;
  onClose: () => void;
}

function mapI18nToTTS(lang: string | undefined | null): 'en' | 'hi' {
  if (typeof lang === 'string' && lang.startsWith('hi')) return 'hi';
  return 'en';
}

function BottomSheet({ clause, onClose }: BottomSheetProps) {
  const { t, i18n } = useTranslation();
  const language = mapI18nToTTS(i18n.language);
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [aiExplanation, setAiExplanation] = useState<string>('')
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false)
  const [translatedExplanation, setTranslatedExplanation] = useState<string>('')

  // Translate AI explanation when language changes
  useEffect(() => {
    const translateExplanation = async () => {
      if (aiExplanation && aiExplanation !== t('aiExplanationUnavailable') && aiExplanation !== t('aiExplanationLoading')) {
        try {
          const currentLang = i18n.language.split('-')[0]; // Get language code without region
          const translated = await translationService.translate({
            text: aiExplanation,
            targetLanguage: currentLang,
            sourceLanguage: language === 'hi' ? 'hi' : 'en' // Assume AI generates in English or Hindi
          });
          setTranslatedExplanation(translated);
        } catch (error) {
          console.error('Translation error:', error);
          setTranslatedExplanation(aiExplanation); // Fallback to original
        }
      } else {
        setTranslatedExplanation(aiExplanation);
      }
    };

    translateExplanation();
  }, [aiExplanation, i18n.language, language, t]);

  // Get AI explanation for the clause
  const getAiExplanation = useCallback(async () => {
    if (!clause || aiExplanation) return;
    setIsLoadingExplanation(true);
    try {
      const explanation = await geminiAnalyzer.getDetailedExplanation(clause, language);
      setAiExplanation(explanation);
    } catch (error) {
      console.error('Failed to get AI explanation:', error);
      setAiExplanation(t('aiExplanationUnavailable'));
    } finally {
      setIsLoadingExplanation(false);
    }
  }, [clause, aiExplanation, language, t]);

  useEffect(() => {
    if (clause && isExpanded) {
      getAiExplanation()
    }
  }, [clause, isExpanded, getAiExplanation])

  const playExplanation = async (type: 'whatItMeans' | 'whatLawSays' | 'aiExplanation') => {
    if (!clause) return;
    setIsPlaying(true);
    try {
      let text = '';
      if (type === 'aiExplanation') {
        text = translatedExplanation || aiExplanation || t('aiExplanationLoading');
      } else {
        const explanation = clauseClassifier.getAudioExplanation(clause.type, clause.riskLevel);
        text = explanation[type][language];
      }
      await ttsService.speak(text, { lang: language, rate: 0.85 });
    } catch (error) {
      console.error('TTS Error:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  const getRiskIcon = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case 'high': return <AlertCircle className="text-red-500" size={20} />
      case 'medium': return <AlertTriangle className="text-yellow-500" size={20} />
      case 'low': return <CheckCircle className="text-green-500" size={20} />
    }
  }

  const getRiskColor = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'low': return 'border-green-200 bg-green-50'
    }
  }

  const getClauseTypeLabel = (type: ClauseType) => {
    switch (type) {
      case 'security_deposit': return t('securityDeposit');
      case 'rent_hike': return t('rentIncrease');
      case 'lock_in_penalty': return t('lockInPenalty');
      default: return t('other');
    }
  };

  if (!clause) return null;

  const explanation = clauseClassifier.getAudioExplanation(clause.type, clause.riskLevel);

  return (
    <div className="fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 shadow-lg z-50 max-w-md mx-auto max-h-[90vh] overflow-hidden">
      <div className="flex flex-col max-h-full">
        <div className="p-4 flex-shrink-0">
          {/* Handle */}
          <div className="flex items-center justify-center mb-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-600"
            >
              <div className="w-8 h-1 bg-gray-300 rounded-full"></div>
              {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
            <button
              onClick={onClose}
              className="absolute right-4 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Header */}
          <div className={`p-4 rounded-lg border ${getRiskColor(clause.riskLevel)} mb-4`}>
            <div className="flex items-start gap-3">
              {getRiskIcon(clause.riskLevel)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-800">{getClauseTypeLabel(clause.type)}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    clause.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                    clause.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {clause.riskLevel === 'high' ? t('highRisk') :
                     clause.riskLevel === 'medium' ? t('mediumRisk') :
                     t('lowRisk')}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{clause.reason}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('confidence')}: {Math.round(clause.confidence * 100)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        {isExpanded && (
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-4">
              {/* What it means */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-blue-800">
                    {t('whatDoesThisMean')}
                  </h4>
                  <button
                    onClick={() => playExplanation('whatItMeans')}
                    disabled={isPlaying}
                    className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    {isPlaying ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </div>
                <p className="text-sm text-blue-700">{explanation.whatItMeans[language]}</p>
              </div>

              {/* What law says */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-purple-800">
                    {t('whatDoesLawSay')}
                  </h4>
                  <button
                    onClick={() => playExplanation('whatLawSays')}
                    disabled={isPlaying}
                    className="p-1 text-purple-600 hover:text-purple-800 disabled:opacity-50"
                  >
                    {isPlaying ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </div>
                <p className="text-sm text-purple-700">{explanation.whatLawSays[language]}</p>
              </div>

              {/* AI Explanation */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-purple-800 flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-600" />
                    {t('aiAnalysis')}
                  </h4>
                  <button
                    onClick={() => playExplanation('aiExplanation')}
                    disabled={isPlaying}
                    className="p-1 text-purple-600 hover:text-purple-800 disabled:opacity-50"
                  >
                    {isPlaying ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </div>
                {translatedExplanation || aiExplanation ? (
                  <p className="text-sm text-purple-700 leading-relaxed">
                    {translatedExplanation || aiExplanation}
                  </p>
                ) : isLoadingExplanation ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <RefreshCw size={14} className="animate-spin" />
                    {t('aiExplanationLoading')}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {t('aiExplanationUnavailable')}
                  </p>
                )}
              </div>

              {/* Original text */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">
                  {t('originalText')}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">{clause.text}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentViewer() {
  const { t, i18n } = useTranslation();
  const language = mapI18nToTTS(i18n.language);
  const router = useRouter();
  const [documentData, setDocumentData] = useState<DocumentData | null>(null)
  const [clauses, setClauses] = useState<ClauseResult[]>([])
  const [selectedClause, setSelectedClause] = useState<ClauseResult | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeminiAnalyzing, setIsGeminiAnalyzing] = useState(false)
  const [geminiAnalysis, setGeminiAnalysis] = useState<{
    clauses: ClauseResult[]
    overallRiskScore: number
    governmentCompliance: {
      compliant: boolean
      violations: string[]
      recommendations: string[]
    }
    summary: string
  } | null>(null)
  const [translatedSummary, setTranslatedSummary] = useState<string>('')
  const [translatedViolations, setTranslatedViolations] = useState<string[]>([])
  const [translatedRecommendations, setTranslatedRecommendations] = useState<string[]>([])

  // Translate AI analysis summary when language changes
  useEffect(() => {
    const translateSummary = async () => {
      if (geminiAnalysis?.summary && i18n.language !== 'en') {
        try {
          const currentLang = i18n.language.split('-')[0]; // Get language code without region
          const translated = await translationService.translate({
            text: geminiAnalysis.summary,
            targetLanguage: currentLang,
            sourceLanguage: 'en' // AI generates in English
          });
          setTranslatedSummary(translated);
          } catch (error) {
            console.error('Summary translation error:', error);
            setTranslatedSummary(geminiAnalysis.summary); // Fallback to original
          }
      } else {
        setTranslatedSummary(geminiAnalysis?.summary || '');
      }
    };

    translateSummary();
  }, [geminiAnalysis?.summary, i18n.language]);

  // Translate violations and recommendations when language changes
  useEffect(() => {
    const translateContent = async () => {
      if (geminiAnalysis && i18n.language !== 'en') {
        const currentLang = i18n.language.split('-')[0];
        
        // Translate violations
        if (geminiAnalysis.governmentCompliance.violations.length > 0) {
          try {
            const translated = await Promise.all(
              geminiAnalysis.governmentCompliance.violations.map(violation =>
                translationService.translate({
                  text: violation,
                  targetLanguage: currentLang,
                  sourceLanguage: 'en'
                }).catch(() => violation) // Fallback to original on error
              )
            );
            setTranslatedViolations(translated);
          } catch (error) {
            console.error('Violations translation error:', error);
            setTranslatedViolations(geminiAnalysis.governmentCompliance.violations);
          }
        } else {
          setTranslatedViolations([]);
        }

        // Translate recommendations
        if (geminiAnalysis.governmentCompliance.recommendations.length > 0) {
          try {
            const translated = await Promise.all(
              geminiAnalysis.governmentCompliance.recommendations.map(rec =>
                translationService.translate({
                  text: rec,
                  targetLanguage: currentLang,
                  sourceLanguage: 'en'
                }).catch(() => rec) // Fallback to original on error
              )
            );
            setTranslatedRecommendations(translated);
          } catch (error) {
            console.error('Recommendations translation error:', error);
            setTranslatedRecommendations(geminiAnalysis.governmentCompliance.recommendations);
          }
        } else {
          setTranslatedRecommendations([]);
        }
      } else {
        setTranslatedViolations(geminiAnalysis?.governmentCompliance.violations || []);
        setTranslatedRecommendations(geminiAnalysis?.governmentCompliance.recommendations || []);
      }
    };

    translateContent();
  }, [geminiAnalysis, i18n.language]);
  const [analysisType, setAnalysisType] = useState<'basic' | 'ai'>('basic')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [analysisPerformed, setAnalysisPerformed] = useState(false);

  const performGeminiAnalysis = useCallback(async (text: string) => {
    setIsGeminiAnalyzing(true);
    try {
      const result = await geminiAnalyzer.analyzeLegalDocument(text, 'india');
      setGeminiAnalysis(result);
    } catch (error) {
      console.error('Gemini analysis failed:', error);
      setGeminiAnalysis({
        clauses: [],
        overallRiskScore: 0,
        governmentCompliance: { compliant: true, violations: [], recommendations: ['AI analysis failed.'] },
        summary: 'AI analysis unavailable.'
      });
    } finally {
      setIsGeminiAnalyzing(false);
    }
  }, [setIsGeminiAnalyzing, setGeminiAnalysis]);

  useEffect(() => {
    const stored = sessionStorage.getItem('lexiyaar-document');
    if (!stored) {
      router.push('/');
      return;
    }
    const data: DocumentData = JSON.parse(stored);
    setDocumentData(data);
  }, [router]);

  useEffect(() => {
    if (documentData && !analysisPerformed) {
      const analyze = async () => {
        setIsAnalyzing(true);
        // Combine all paragraphs from all pages for analysis
        const allParagraphs = documentData.pages.flatMap(page => page.paragraphs);
        const basicResults = clauseClassifier.classifyText(allParagraphs);
        setClauses(basicResults);
        setIsAnalyzing(false);
        
        // Combine all extracted text for AI analysis
        const combinedText = documentData.pages.map(page => page.extractedText).join('\n\n--- Page Break ---\n\n');
        await performGeminiAnalysis(combinedText);
        
        setAnalysisPerformed(true);
      };
      analyze();
    }
  }, [documentData, analysisPerformed, performGeminiAnalysis, setIsAnalyzing, setClauses, setAnalysisPerformed]);

  const handleClauseClick = useCallback((clause: ClauseResult) => {
    setSelectedClause(clause)
  }, [])

  const closeBottomSheet = useCallback(() => {
    setSelectedClause(null)
  }, [])

  const downloadResults = useCallback(() => {
    if (!documentData) return

    const results = {
      filename: documentData.filename,
      processedAt: documentData.processedAt,
      totalPages: documentData.totalPages,
      pages: documentData.pages.map(page => ({
        pageNumber: page.pageNumber,
        confidence: page.confidence,
        extractedText: page.extractedText,
        paragraphs: page.paragraphs
      })),
      clauses: clauses.map(clause => ({
        type: clause.type,
        riskLevel: clause.riskLevel,
        confidence: clause.confidence,
        reason: clause.reason,
        text: clause.text
      }))
    }

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lexiyaar-analysis-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [documentData, clauses])

  const getRiskStats = useCallback(() => {
    const currentClauses = analysisType === 'ai' && geminiAnalysis 
      ? geminiAnalysis.clauses 
      : clauses
      
    const stats = { high: 0, medium: 0, low: 0 }
    currentClauses.forEach(clause => {
      stats[clause.riskLevel]++
    })
    return stats
  }, [clauses, analysisType, geminiAnalysis])

  const getCurrentClauses = useCallback(() => {
    const allClauses = analysisType === 'ai' && geminiAnalysis 
      ? geminiAnalysis.clauses 
      : clauses;
    
    if (riskFilter) {
      return allClauses.filter(clause => clause.riskLevel === riskFilter);
    }
    return allClauses;
  }, [clauses, analysisType, geminiAnalysis, riskFilter]);

  if (!documentData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    )
  }

  const riskStats = getRiskStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-pink-50">
      {/* Modern Header */}
      <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-red-600 to-red-700 text-white shadow-xl backdrop-blur-md" style={{ WebkitBackdropFilter: 'blur(8px)' }}>
        <div className="relative flex items-center px-4 py-3 gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 backdrop-blur-sm border border-white/20 active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={22} className="text-white" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-white truncate flex-1">Document Analysis</h1>
          <button
            onClick={downloadResults}
            className="flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 backdrop-blur-sm border border-white/20 active:scale-95"
            aria-label="Download"
          >
            <Download size={20} className="text-white" />
          </button>
        </div>
        <div className="px-4 pb-2">
          <p className="text-xs text-red-100 truncate">{documentData.filename}</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 pb-32">
        {/* Modern Analysis Type Toggle */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                  <Brain size={20} className="text-white" />
                </div>
                Document Analysis
              </h2>
              <p className="text-gray-600 mt-1">Choose your analysis method</p>
            </div>
            <div className="flex bg-gray-100 rounded-xl p-1.5 shadow-inner">
              <button
                onClick={() => setAnalysisType('basic')}
                className={`px-5 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  analysisType === 'basic'
                    ? 'bg-white text-red-600 shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full transition-colors ${
                  analysisType === 'basic' ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                Basic Analysis
              </button>
              <button
                onClick={() => setAnalysisType('ai')}
                className={`px-5 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  analysisType === 'ai'
                    ? 'bg-white text-red-600 shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Brain size={16} className={analysisType === 'ai' ? 'text-red-500' : 'text-gray-400'} />
                AI Analysis
                {isGeminiAnalyzing && <RefreshCw size={14} className="animate-spin text-red-500" />}
              </button>
            </div>
          </div>

          {/* Analysis Summary */}
          {analysisType === 'ai' && geminiAnalysis && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3 sm:p-4 mb-4">
              <div className="flex items-start gap-3">
                <Sparkles className="text-purple-600 mt-1 flex-shrink-0" size={20} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-purple-800 mb-2 text-sm sm:text-base">AI Analysis Summary</h3>
                  <p className="text-sm text-purple-700 mb-3 leading-relaxed break-words">
                    {translatedSummary || geminiAnalysis.summary}
                  </p>

                  {/* Overall Risk Score - Responsive Layout */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-sm font-medium text-purple-800 whitespace-nowrap">Overall Risk:</span>
                      <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium w-fit ${
                        geminiAnalysis.overallRiskScore >= 70 ? 'bg-red-100 text-red-700' :
                        geminiAnalysis.overallRiskScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {geminiAnalysis.overallRiskScore}% Risk
                      </div>
                    </div>

                    {/* Compliance Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-sm font-medium text-purple-800 whitespace-nowrap">Legal Compliance:</span>
                      <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium w-fit ${
                        geminiAnalysis.governmentCompliance.compliant
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {geminiAnalysis.governmentCompliance.compliant ? 'Compliant' : 'Non-Compliant'}
                      </div>
                    </div>
                  </div>

                  {/* Violations */}
                  {!geminiAnalysis.governmentCompliance.compliant && (
                    <div className="mt-3 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-red-800 mb-2">Legal Violations:</h4>
                      <ul className="space-y-1">
                        {translatedViolations.map((violation, index) => (
                          <li key={index} className="text-xs text-red-700 flex items-start gap-2 leading-relaxed">
                            <span className="text-red-500 flex-shrink-0">•</span>
                            <span className="break-words">{violation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {geminiAnalysis.governmentCompliance.recommendations.length > 0 && (
                    <div className="mt-3 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">AI Recommendations:</h4>
                      <ul className="space-y-1">
                        {translatedRecommendations.map((rec, index) => (
                          <li key={index} className="text-xs text-blue-700 flex items-start gap-2 leading-relaxed">
                            <span className="text-blue-500 flex-shrink-0">•</span>
                            <span className="break-words">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Modern Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setRiskFilter(riskFilter === 'high' ? null : 'high')}
            className={`group relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-6 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
              riskFilter === 'high' ? 'ring-4 ring-red-300 scale-105 shadow-2xl' : ''
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-3">
                <AlertCircle className="text-red-500" size={24} />
                <div className="text-3xl font-bold text-red-600">{riskStats.high}</div>
              </div>
              <div className="text-sm font-semibold text-red-700">
                {language === 'hi' ? 'उच्च जोखिम' : 'High Risk'}
              </div>
              <div className="text-xs text-red-600/70 mt-1">Critical Issues</div>
            </div>
          </button>
          
          <button
            onClick={() => setRiskFilter(riskFilter === 'medium' ? null : 'medium')}
            className={`group relative overflow-hidden bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl p-6 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
              riskFilter === 'medium' ? 'ring-4 ring-yellow-300 scale-105 shadow-2xl' : ''
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-3">
                <AlertTriangle className="text-yellow-500" size={24} />
                <div className="text-3xl font-bold text-yellow-600">{riskStats.medium}</div>
              </div>
              <div className="text-sm font-semibold text-yellow-700">
                {language === 'hi' ? 'मध्यम जोखिम' : 'Medium Risk'}
              </div>
              <div className="text-xs text-yellow-600/70 mt-1">Review Needed</div>
            </div>
          </button>
          
          <button
            onClick={() => setRiskFilter(riskFilter === 'low' ? null : 'low')}
            className={`group relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
              riskFilter === 'low' ? 'ring-4 ring-green-300 scale-105 shadow-2xl' : ''
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-3">
                <CheckCircle className="text-green-500" size={24} />
                <div className="text-3xl font-bold text-green-600">{riskStats.low}</div>
              </div>
              <div className="text-sm font-semibold text-green-700">
                {language === 'hi' ? 'कम जोखिम' : 'Low Risk'}
              </div>
              <div className="text-xs text-green-600/70 mt-1">Acceptable</div>
            </div>
          </button>
        </div>

        {/* Document Display */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Original Image */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {language === 'hi' ? 'मूल दस्तावेज़' : 'Original Document'}
              </h2>
              {documentData && documentData.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>
                  <span className="text-sm text-gray-600">
                    {currentPage + 1} / {documentData.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(documentData.totalPages - 1, currentPage + 1))}
                    disabled={currentPage === documentData.totalPages - 1}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Image
                src={documentData ? documentData.pages[currentPage].image : ''}
                alt={`Document page ${currentPage + 1}`}
                width={800}
                height={600}
                className="w-full h-auto"
                style={{ objectFit: 'contain' }}
              />
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <p>{language === 'hi' ? 'संसाधित' : 'Processed'}: {formatDate(new Date(documentData?.processedAt || ''))}</p>
              <p>{language === 'hi' ? 'OCR विश्वसनीयता' : 'OCR Confidence'}: {Math.round(documentData?.pages[currentPage].confidence || 0)}%</p>
              <p>{language === 'hi' ? 'पृष्ठ' : 'Page'}: {currentPage + 1} {language === 'hi' ? 'का' : 'of'} {documentData?.totalPages}</p>
            </div>
          </div>

          {/* Analyzed Text */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {language === 'hi' ? 'विश्लेषित पाठ' : 'Analyzed Text'}
              </h2>
              {documentData && documentData.totalPages > 1 && (
                <div className="text-sm text-gray-600">
                  Page {currentPage + 1} of {documentData.totalPages}
                </div>
              )}
            </div>
            <div
              ref={scrollContainerRef}
              className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50"
            >
              {isAnalyzing ? (
                <p className="text-center text-gray-500">Analyzing document...</p>
              ) : documentData ? (
                documentData.pages[currentPage].paragraphs.map((paragraph: string, index: number) => {
                  // Find if this paragraph has any clauses
                  const paragraphClauses = clauses.filter(clause =>
                    clause.text.includes(paragraph.substring(0, 100))
                  )

                  return (
                    <div key={index} className="mb-4 last:mb-0">
                      <p className="text-sm text-gray-700 leading-relaxed mb-2">
                        {paragraph}
                      </p>
                      {paragraphClauses.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {paragraphClauses.map((clause) => (
                            <button
                              key={clause.id}
                              onClick={() => handleClauseClick(clause)}
                              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                                clause.riskLevel === 'high' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                                clause.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                                'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {clause.riskLevel === 'high' ? '⚠️' :
                               clause.riskLevel === 'medium' ? '⚡' : '✅'}
                              {clause.type.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-center text-gray-500">No document data available</p>
              )}
            </div>
          </div>
        </div>

        {/* All Clauses List */}
        {clauses.length > 0 && (
          <div className="mt-6 bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {language === 'hi' ? 'पहचाने गए खंड' : 'Identified Clauses'} ({getCurrentClauses().length})
              </h2>
              {isGeminiAnalyzing && (
                <div className="flex items-center gap-2 text-sm text-purple-600">
                  <RefreshCw size={16} className="animate-spin" />
                  AI analyzing...
                </div>
              )}
            </div>
            <div className="space-y-3">
              {getCurrentClauses().map((clause) => (
                <button
                  key={clause.id}
                  onClick={() => handleClauseClick(clause)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors hover:shadow-md ${
                    clause.riskLevel === 'high' ? 'border-red-200 bg-red-50 hover:bg-red-100' :
                    clause.riskLevel === 'medium' ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100' :
                    'border-green-200 bg-green-50 hover:bg-green-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {clause.riskLevel === 'high' ? <AlertCircle className="text-red-500" size={20} /> :
                       clause.riskLevel === 'medium' ? <AlertTriangle className="text-yellow-500" size={20} /> :
                       <CheckCircle className="text-green-500" size={20} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800">
                          {clause.type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.round(clause.confidence * 100)}% confidence
                        </span>
                        {analysisType === 'ai' && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            AI
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{clause.reason}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {clause.text.substring(0, 120)}...
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Clauses Found */}
        {clauses.length === 0 && !isAnalyzing && (
          <div className="mt-6 bg-white rounded-xl p-8 shadow-lg text-center">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              {language === 'hi' ? 'कोई जोखिम भरे खंड नहीं मिले' : 'No Risk Clauses Found'}
            </h3>
            <p className="text-gray-600">
              {language === 'hi' 
                ? 'इस दस्तावेज़ में कोई स्पष्ट जोखिम भरे खंड नहीं मिले। फिर भी कानूनी सलाह लेना उचित होगा।'
                : 'No explicit risky clauses were found in this document. However, it is still advisable to seek legal counsel.'}
            </p>
          </div>
        )}

        {/* Legal Disclaimer */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800 text-center leading-relaxed">
            ⚠️ {t('disclaimer')}
          </p>
        </div>
      </div>

      {/* Bottom Sheet */}
      <BottomSheet
        clause={selectedClause}
        onClose={closeBottomSheet}
      />

      {/* Risk Details Modal */}
      {riskFilter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 relative">
            <button
              onClick={() => setRiskFilter(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {riskFilter === 'high' ? (language === 'hi' ? 'उच्च जोखिम विवरण' : 'High Risk Details') :
               riskFilter === 'medium' ? (language === 'hi' ? 'मध्यम जोखिम विवरण' : 'Medium Risk Details') :
               (language === 'hi' ? 'कम जोखिम विवरण' : 'Low Risk Details')}
            </h3>
            <ul className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {getCurrentClauses().map((clause, idx) => (
                <li key={clause.id || idx} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    {clause.riskLevel === 'high' ? <AlertCircle className="text-red-500" size={18} /> :
                     clause.riskLevel === 'medium' ? <AlertTriangle className="text-yellow-500" size={18} /> :
                     <CheckCircle className="text-green-500" size={18} />}
                    <span className="font-semibold text-gray-800">{clause.type.replace('_', ' ')}</span>
                    <span className={`ml-auto px-2 py-0.5 text-xs rounded-full font-medium ${
                      clause.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                      clause.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {clause.riskLevel === 'high' ? (language === 'hi' ? 'उच्च जोखिम' : 'High Risk') :
                       clause.riskLevel === 'medium' ? (language === 'hi' ? 'मध्यम जोखिम' : 'Medium Risk') :
                       (language === 'hi' ? 'कम जोखिम' : 'Low Risk')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{clause.reason}</p>
                  <p className="text-xs text-gray-500">
                    {language === 'hi' ? 'विश्वसनीयता' : 'Confidence'}: {Math.round(clause.confidence * 100)}%
                  </p>
                </li>
              ))}
              {getCurrentClauses().length === 0 && (
                <li className="text-center text-gray-500 py-8">
                  <div className="mb-2 font-semibold text-lg text-red-600">
                    {language === 'hi' ? 'कोई जोखिम भरे खंड नहीं मिले' : 'No Risk Clauses Found'}
                  </div>
                  <div className="text-sm text-gray-700">
                    {language === 'hi'
                      ? 'इस दस्तावेज़ में कोई स्पष्ट जोखिम भरे खंड नहीं मिले। फिर भी कानूनी सलाह लेना उचित होगा।'
                      : 'No explicit risky clauses were found in this document. However, it is still advisable to seek legal counsel.'}
                  </div>
                  {/* Show all clauses if available */}
                  {clauses.length > 0 && (
                    <div className="mt-4">
                      <div className="font-medium text-gray-800 mb-2">
                        {language === 'hi' ? 'सभी खंड:' : 'All Clauses:'}
                      </div>
                      <ul className="space-y-2 max-h-40 overflow-y-auto">
                        {clauses.map((clause, idx) => (
                          <li key={clause.id || idx} className="border rounded p-2 bg-gray-50 flex items-center gap-2">
                            {clause.riskLevel === 'high' ? <AlertCircle className="text-red-500" size={16} /> :
                             clause.riskLevel === 'medium' ? <AlertTriangle className="text-yellow-500" size={16} /> :
                             <CheckCircle className="text-green-500" size={16} />}
                            <span className="text-xs text-gray-800">{clause.type.replace('_', ' ')}</span>
                            <span className={`ml-auto px-2 py-0.5 text-xs rounded-full font-medium ${
                              clause.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                              clause.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {clause.riskLevel === 'high' ? (language === 'hi' ? 'उच्च जोखिम' : 'High Risk') :
                               clause.riskLevel === 'medium' ? (language === 'hi' ? 'मध्यम जोखिम' : 'Medium Risk') :
                               (language === 'hi' ? 'कम जोखिम' : 'Low Risk')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
