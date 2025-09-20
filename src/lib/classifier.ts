import { ClauseResult, ClauseType, RiskLevel, AudioExplanation } from '@/types'
import { generateId } from './utils'
import { geminiAnalyzer, GovernmentType } from './gemini-ai'

interface ClassifierRule {
  type: ClauseType
  patterns: RegExp[]
  keywords: string[]
  riskLevel: RiskLevel
  weightedScore: number
  reason: string
}

// Classification rules for different clause types
const CLASSIFICATION_RULES: ClassifierRule[] = [
  // Security Deposit - High Risk
  {
    type: 'security_deposit',
    patterns: [
      /security\s+deposit.*(?:forfeited?|forfeit|retained?|deducted?)/i,
      /deposit.*(?:will\s+not\s+be|shall\s+not\s+be).*returned?/i,
      /(?:advance|deposit).*(?:adjusted?|adjustment).*rent/i,
      /deposit.*(?:damages?|wear\s+and\s+tear).*(?:as\s+per|at\s+the\s+discretion)/i,
    ],
    keywords: ['forfeit deposit', 'non-refundable deposit', 'deposit adjustment'],
    riskLevel: 'high',
    weightedScore: 0.9,
    reason: 'Unfair security deposit forfeiture or deduction clause'
  },
  
  // Security Deposit - Medium Risk  
  {
    type: 'security_deposit',
    patterns: [
      /deposit.*(?:subject\s+to|conditions?|terms?)/i,
      /security.*(?:damages?|repairs?|maintenance)/i,
      /wear\s+and\s+tear.*(?:normal|reasonable).*(?:not|exclude)/i,
    ],
    keywords: ['deposit conditions', 'wear and tear', 'damage assessment'],
    riskLevel: 'medium',
    weightedScore: 0.6,
    reason: 'Vague or ambiguous security deposit terms'
  },

  // Rent Hike - High Risk
  {
    type: 'rent_hike',
    patterns: [
      /rent.*(?:increase|enhanced?|raised?).*(?:at\s+the\s+discretion|sole\s+discretion|without\s+notice)/i,
      /owner.*(?:right|entitled?).*(?:increase|enhance|raise).*rent.*(?:any\s+time|without\s+limit)/i,
      /rent.*(?:revision|review).*(?:monthly|quarterly|any\s+time)/i,
      /annual.*increase.*(?:minimum|not\s+less\s+than).*\d+.*percent/i,
    ],
    keywords: ['arbitrary rent increase', 'discretionary rent hike', 'unlimited increase'],
    riskLevel: 'high',
    weightedScore: 0.85,
    reason: 'Arbitrary or excessive rent increase provision'
  },

  // Rent Hike - Medium Risk
  {
    type: 'rent_hike',
    patterns: [
      /rent.*(?:increase|enhanced?).*annual/i,
      /(?:market\s+rate|prevailing\s+rate).*rent.*adjustment/i,
      /rent.*(?:subject\s+to|liable\s+to).*(?:change|modification)/i,
    ],
    keywords: ['annual rent increase', 'market rate adjustment'],
    riskLevel: 'medium',
    weightedScore: 0.5,
    reason: 'Potential for regular rent increases'
  },

  // Lock-in Penalty - High Risk
  {
    type: 'lock_in_penalty',
    patterns: [
      /(?:lock.?in|lock.?up).*(?:period|clause).*(?:months?|years?).*(?:penalty|charges?|forfeit)/i,
      /(?:vacate|leave|exit).*(?:before|prior\s+to).*(?:penalty|charges?|forfeit)/i,
      /(?:termination|breaking).*(?:agreement|contract).*(?:penalty|charges?).*(?:months?\s+rent|\d+.*deposit)/i,
      /(?:notice\s+period|advance\s+notice).*(?:months?|days?).*(?:failing|without).*penalty/i,
    ],
    keywords: ['lock-in penalty', 'early termination charges', 'forfeit deposit'],
    riskLevel: 'high',
    weightedScore: 0.8,
    reason: 'Harsh lock-in period with heavy penalties'
  },

  // Lock-in Penalty - Medium Risk
  {
    type: 'lock_in_penalty',
    patterns: [
      /(?:minimum|initial).*(?:tenure|period).*(?:months?|years?)/i,
      /(?:notice\s+period|advance\s+notice).*(?:months?|days?)/i,
      /(?:early|premature).*(?:vacation|exit|termination)/i,
    ],
    keywords: ['minimum tenure', 'notice period', 'early vacation'],
    riskLevel: 'medium',
    weightedScore: 0.4,
    reason: 'Standard lock-in terms that may limit flexibility'
  },
]

// Audio explanations for each clause type and risk level
const AUDIO_EXPLANATIONS: Record<ClauseType, Record<RiskLevel, AudioExplanation>> = {
  security_deposit: {
    high: {
      whatItMeans: {
        hi: "इसका मतलब है कि मालिक आपकी जमानत राशि को बिना उचित कारण के जब्त कर सकता है।",
        en: "This means the owner can forfeit your security deposit without proper justification."
      },
      whatLawSays: {
        hi: "कानून के अनुसार, सामान्य टूट-फूट के लिए जमानत राशि नहीं काटी जा सकती।",
        en: "By law, security deposit cannot be deducted for normal wear and tear."
      }
    },
    medium: {
      whatItMeans: {
        hi: "जमानत राशि की वापसी अस्पष्ट शर्तों पर निर्भर है।",
        en: "Security deposit refund depends on unclear conditions."
      },
      whatLawSays: {
        hi: "सभी कटौतियों के लिए उचित रसीद और औचित्य देना आवश्यक है।",
        en: "Proper receipts and justification required for all deductions."
      }
    },
    low: {
      whatItMeans: {
        hi: "जमानत राशि की शर्तें उचित लगती हैं।",
        en: "Security deposit terms appear reasonable."
      },
      whatLawSays: {
        hi: "उचित नुकसान के लिए ही जमानत राशि काटी जा सकती है।",
        en: "Security deposit can only be deducted for legitimate damages."
      }
    }
  },
  rent_hike: {
    high: {
      whatItMeans: {
        hi: "मालिक बिना नोटिस के या मनमाने तरीके से किराया बढ़ा सकता है।",
        en: "Owner can increase rent arbitrarily or without notice."
      },
      whatLawSays: {
        hi: "राज्य के किराया नियंत्रण कानून के अनुसार किराया वृद्धि सीमित होनी चाहिए।",
        en: "Rent increases should be limited as per state rent control laws."
      }
    },
    medium: {
      whatItMeans: {
        hi: "नियमित किराया वृद्धि हो सकती है।",
        en: "Regular rent increases may occur."
      },
      whatLawSays: {
        hi: "किराया वृद्धि उचित नोटिस के साथ होनी चाहिए।",
        en: "Rent increases should be with proper notice."
      }
    },
    low: {
      whatItMeans: {
        hi: "किराया वृद्धि की शर्तें उचित हैं।",
        en: "Rent increase terms are reasonable."
      },
      whatLawSays: {
        hi: "निष्पक्ष किराया वृद्धि कानूनी रूप से मान्य है।",
        en: "Fair rent increases are legally valid."
      }
    }
  },
  lock_in_penalty: {
    high: {
      whatItMeans: {
        hi: "जल्दी छोड़ने पर भारी जुर्माना या जमानत राशि जब्त हो सकती है।",
        en: "Heavy penalty or deposit forfeiture for early exit."
      },
      whatLawSays: {
        hi: "अनुचित लॉक-इन खंड भारतीय अनुबंध कानून के तहत चुनौती योग्य हैं।",
        en: "Unreasonable lock-in clauses are challengeable under Indian Contract Law."
      }
    },
    medium: {
      whatItMeans: {
        hi: "न्यूनतम अवधि की बाध्यता है।",
        en: "There is a minimum tenure obligation."
      },
      whatLawSays: {
        hi: "उचित नोटिस पीरियड कानूनी रूप से मान्य है।",
        en: "Reasonable notice periods are legally valid."
      }
    },
    low: {
      whatItMeans: {
        hi: "लॉक-इन शर्तें उचित हैं।",
        en: "Lock-in terms are reasonable."
      },
      whatLawSays: {
        hi: "मानक लॉक-इन अवधि स्वीकार्य है।",
        en: "Standard lock-in periods are acceptable."
      }
    }
  },
  other: {
    high: {
      whatItMeans: {
        hi: "इस खंड में जोखिम हो सकता है।",
        en: "This clause may contain risks."
      },
      whatLawSays: {
        hi: "कानूनी सलाह लेना उचित होगा।",
        en: "Legal advice would be appropriate."
      }
    },
    medium: {
      whatItMeans: {
        hi: "इस खंड की सावधानीपूर्वक समीक्षा करें।",
        en: "Review this clause carefully."
      },
      whatLawSays: {
        hi: "अस्पष्ट शर्तों को स्पष्ट करने का अधिकार है।",
        en: "Right to clarify unclear terms."
      }
    },
    low: {
      whatItMeans: {
        hi: "यह खंड सामान्य है।",
        en: "This clause appears standard."
      },
      whatLawSays: {
        hi: "मानक अनुबंध शर्तें स्वीकार्य हैं।",
        en: "Standard contract terms are acceptable."
      }
    }
  }
}

export class ClauseClassifier {
  // Enhanced classification using Gemini AI
  async classifyWithAI(
    text: string, 
    governmentType: GovernmentType = 'general'
  ): Promise<{
    clauses: ClauseResult[]
    overallRiskScore: number
    governmentCompliance: {
      compliant: boolean
      violations: string[]
      recommendations: string[]
    }
    summary: string
  }> {
    try {
      // Use Gemini AI for advanced analysis
      const aiAnalysis = await geminiAnalyzer.analyzeLegalDocument(text, governmentType)
      
      // Also run local classification for comparison
      const paragraphs = text.split('\n').filter(p => p.trim().length > 0)
      const localResults = this.classifyText(paragraphs)
      
      // Merge results, preferring AI results but including local findings
      const mergedClauses = this.mergeClassificationResults(aiAnalysis.clauses, localResults)
      
      return {
        clauses: mergedClauses,
        overallRiskScore: aiAnalysis.overallRiskScore,
        governmentCompliance: aiAnalysis.governmentCompliance,
        summary: aiAnalysis.summary
      }
    } catch (error) {
      console.error('AI classification failed, falling back to local:', error)
      // Fallback to local classification only
      const paragraphs = text.split('\n').filter(p => p.trim().length > 0)
      const localResults = this.classifyText(paragraphs)
      
      return {
        clauses: localResults,
        overallRiskScore: this.calculateOverallRiskScore(localResults),
        governmentCompliance: {
          compliant: true,
          violations: [],
          recommendations: ['AI analysis unavailable - manual review recommended']
        },
        summary: `Local analysis found ${localResults.length} potential issues. AI analysis unavailable.`
      }
    }
  }

  private mergeClassificationResults(
    aiClauses: ClauseResult[],
    localClauses: ClauseResult[]
  ): ClauseResult[] {
    const merged = [...aiClauses]
    
    // Add local clauses that weren't detected by AI
    localClauses.forEach(localClause => {
      const similar = aiClauses.find(aiClause => 
        this.areSimilarClauses(aiClause.text, localClause.text)
      )
      
      if (!similar) {
        merged.push({
          ...localClause,
          reason: `[Local Detection] ${localClause.reason}`
        })
      }
    })
    
    return merged
  }

  private areSimilarClauses(text1: string, text2: string): boolean {
    // Simple similarity check - can be improved
    const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim()
    const norm1 = normalize(text1)
    const norm2 = normalize(text2)
    
    // Check if one contains the other or if they overlap significantly
    return norm1.includes(norm2.substring(0, 50)) || 
           norm2.includes(norm1.substring(0, 50))
  }

  private calculateOverallRiskScore(clauses: ClauseResult[]): number {
    if (clauses.length === 0) return 0
    
    let totalScore = 0
    clauses.forEach(clause => {
      const weight = clause.riskLevel === 'high' ? 30 : 
                    clause.riskLevel === 'medium' ? 20 : 10
      totalScore += weight * clause.confidence
    })
    
    return Math.min(Math.round(totalScore / clauses.length), 100)
  }

  // Original local classification method
  classifyText(paragraphs: string[]): ClauseResult[] {
    const results: ClauseResult[] = []

    paragraphs.forEach((paragraph, index) => {
      const matchedRules = this.findMatchingRules(paragraph)
      
      matchedRules.forEach(match => {
        const clauseResult: ClauseResult = {
          id: generateId(),
          text: paragraph,
          type: match.rule.type,
          confidence: match.score,
          riskLevel: match.rule.riskLevel,
          reason: match.rule.reason,
          position: {
            x: 0,
            y: index * 50, // Approximate position based on paragraph index
            width: 100,
            height: 40
          }
        }

        results.push(clauseResult)
      })
    })

    // Remove duplicates and keep highest confidence matches
    return this.deduplicateResults(results)
  }

  private findMatchingRules(text: string): Array<{rule: ClassifierRule, score: number}> {
    const matches: Array<{rule: ClassifierRule, score: number}> = []

    CLASSIFICATION_RULES.forEach(rule => {
      let score = 0
      let matchCount = 0

      // Check regex patterns
      rule.patterns.forEach(pattern => {
        if (pattern.test(text)) {
          score += rule.weightedScore * 0.7 // 70% weight for regex matches
          matchCount++
        }
      })

      // Check keywords
      rule.keywords.forEach(keyword => {
        const regex = new RegExp(keyword.replace(/\s+/g, '\\s+'), 'i')
        if (regex.test(text)) {
          score += rule.weightedScore * 0.3 // 30% weight for keyword matches
          matchCount++
        }
      })

      // Only consider if there's at least one match and score is above threshold
      if (matchCount > 0 && score > 0.2) {
        matches.push({
          rule,
          score: Math.min(score, 1) // Cap at 1.0
        })
      }
    })

    return matches.sort((a, b) => b.score - a.score)
  }

  private deduplicateResults(results: ClauseResult[]): ClauseResult[] {
    const seen = new Set<string>()
    const deduplicated: ClauseResult[] = []

    // Sort by confidence (highest first)
    results.sort((a, b) => b.confidence - a.confidence)

    results.forEach(result => {
      const key = `${result.type}-${result.text.substring(0, 50)}`
      if (!seen.has(key)) {
        seen.add(key)
        deduplicated.push(result)
      }
    })

    return deduplicated
  }

  getAudioExplanation(type: ClauseType, riskLevel: RiskLevel): AudioExplanation {
    return AUDIO_EXPLANATIONS[type][riskLevel]
  }

  // Method to get risk color for UI
  getRiskColor(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case 'high': return '#ef4444' // red-500
      case 'medium': return '#f59e0b' // amber-500  
      case 'low': return '#10b981' // emerald-500
      default: return '#6b7280' // gray-500
    }
  }
}

// Export singleton instance
export const clauseClassifier = new ClauseClassifier()