import { GoogleGenerativeAI } from '@google/generative-ai'
import { ClauseResult, ClauseType, RiskLevel } from '@/types'
import { generateId } from './utils'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')

export type GovernmentType = 'india' | 'us' | 'general'

interface LegalAnalysisResult {
  clauses: ClauseResult[]
  overallRiskScore: number
  governmentCompliance: {
    compliant: boolean
    violations: string[]
    recommendations: string[]
  }
  summary: string
}

interface GovernmentRegulations {
  india: {
    rentControl: string[]
    tenantProtection: string[]
    depositRules: string[]
  }
  us: {
    fairHousing: string[]
    securityDeposit: string[]
    evictionProtection: string[]
  }
}

const GOVERNMENT_REGULATIONS: GovernmentRegulations = {
  india: {
    rentControl: [
      'Rent Control Act varies by state',
      'Maximum 10% annual rent increase in most states',
      'Advance rent limited to 2-3 months',
      'Security deposit typically capped at 2-3 months rent'
    ],
    tenantProtection: [
      'Cannot evict without proper notice (typically 1-3 months)',
      'Essential services cannot be cut off',
      'Tenant has right to receipt for all payments',
      'Landlord must provide habitable premises'
    ],
    depositRules: [
      'Security deposit must be refunded within 1-2 months of vacancy',
      'Deductions only for actual damages beyond normal wear',
      'Interest may be payable on deposit in some states',
      'Written itemization of deductions required'
    ]
  },
  us: {
    fairHousing: [
      'No discrimination based on race, color, religion, sex, national origin, disability, or family status',
      'Reasonable accommodations for disabilities required',
      'Equal treatment in terms, conditions, and privileges',
      'Advertising must not indicate discriminatory preferences'
    ],
    securityDeposit: [
      'State-specific limits (typically 1-2 months rent)',
      'Must be held in separate account in many states',
      'Return within 14-60 days depending on state',
      'Written itemization of deductions required'
    ],
    evictionProtection: [
      'Proper notice required (typically 30-60 days)',
      'Cannot evict in retaliation for complaints',
      'Court process required for eviction',
      'Cannot use self-help eviction methods'
    ]
  }
}

interface ProblematicClause {
  type: ClauseType;
  text: string;
  riskLevel: RiskLevel;
  reason: string;
  legalBasis: string;
  suggestion: string;
}

export class GeminiLegalAnalyzer {
  private model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: 0.3,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 4096,
    }
  })

  async analyzeLegalDocument(
    text: string, 
    governmentType: GovernmentType = 'general'
  ): Promise<LegalAnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(text, governmentType)
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const analysisText = response.text()
      
      return this.parseAnalysisResponse(analysisText, text, governmentType)
    } catch (error) {
      console.error('Error analyzing document with Gemini:', error)
      throw new Error('Failed to analyze legal document')
    }
  }

  private buildAnalysisPrompt(text: string, governmentType: GovernmentType): string {
    const regulations = governmentType === 'india' 
      ? GOVERNMENT_REGULATIONS.india 
      : governmentType === 'us' 
      ? GOVERNMENT_REGULATIONS.us 
      : null

    let governmentContext = ''
    if (regulations) {
      if (governmentType === 'india') {
        const indiaRegs = regulations as GovernmentRegulations['india'];
        governmentContext = `
        Analyze this document according to ${governmentType.toUpperCase()} regulations:
        - Rent Control: ${indiaRegs.rentControl.join(', ')}
        - Tenant Protection: ${indiaRegs.tenantProtection.join(', ')}
        - Deposit Rules: ${indiaRegs.depositRules.join(', ')}
        `;
      } else if (governmentType === 'us') {
        const usRegs = regulations as GovernmentRegulations['us'];
        governmentContext = `
        Analyze this document according to ${governmentType.toUpperCase()} regulations:
        - Fair Housing: ${usRegs.fairHousing.join(', ')}
        - Security Deposit: ${usRegs.securityDeposit.join(', ')}
        - Eviction Protection: ${usRegs.evictionProtection.join(', ')}
        `;
      }
    }

    return `
    You are an expert legal document analyzer. Your task is to analyze any legal document, including but not limited to contracts, agreements, and affidavits.
    ${governmentContext}

    Analyze the following legal document and identify important or potentially problematic clauses. For each clause, provide a detailed analysis.

    Document Text:
    "${text}"

    Please provide a detailed analysis in the following JSON format:
    {
      "problematicClauses": [
        {
          "type": "payment|liability|confidentiality|termination|jurisdiction|indemnity|warranty|force_majeure|dispute_resolution|governing_law|other",
          "text": "exact text of the clause",
          "riskLevel": "high|medium|low|informational",
          "reason": "explanation of what this clause means and why it is important or problematic",
          "legalBasis": "relevant law or regulation, if applicable",
          "suggestion": "suggestion for improvement or negotiation, if applicable"
        }
      ],
      "governmentCompliance": {
        "compliant": true/false,
        "violations": ["list of any specific legal or regulatory violations found"],
        "recommendations": ["list of recommendations to ensure compliance"]
      },
      "overallRiskScore": "a score from 0 (low risk) to 100 (high risk) based on the document's content",
      "summary": "a brief summary of the document's purpose and key terms"
    }
    `;
  }

  private parseAnalysisResponse(
    responseText: string, 
    originalText: string,
    governmentType: GovernmentType
  ): LegalAnalysisResult {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const analysis = JSON.parse(jsonMatch[0])
      
      // Convert to ClauseResult format
interface ProblematicClause {
  type: ClauseType;
  text: string;
  riskLevel: RiskLevel;
  reason: string;
  legalBasis: string;
  suggestion: string;
}

// ... existing code ...

      const clauses: ClauseResult[] = (analysis.problematicClauses || []).map((clause: ProblematicClause) => ({
        id: generateId(),
        text: clause.text || '',
        type: this.mapToClauseType(clause.type),
        confidence: this.calculateConfidence(clause),
        riskLevel: clause.riskLevel as RiskLevel || 'medium',
        reason: clause.reason || '',
        legalBasis: clause.legalBasis,
        suggestion: clause.suggestion,
        position: this.findTextPosition(clause.text, originalText)
      }))

      return {
        clauses,
        overallRiskScore: analysis.overallRiskScore || this.calculateOverallRisk(clauses),
        governmentCompliance: {
          compliant: analysis.governmentCompliance?.compliant ?? true,
          violations: analysis.governmentCompliance?.violations || [],
          recommendations: analysis.governmentCompliance?.recommendations || []
        },
        summary: analysis.summary || this.generateSummary(clauses, governmentType)
      }
    } catch (error) {
      console.error('Error parsing Gemini response:', error)
      // Fallback to basic analysis
      return {
        clauses: [],
        overallRiskScore: 0,
        governmentCompliance: {
          compliant: true,
          violations: [],
          recommendations: []
        },
        summary: 'Unable to perform detailed analysis. Please review the document manually.'
      }
    }
  }

  private mapToClauseType(type: string): ClauseType {
    const typeMap: Record<string, ClauseType> = {
      'security_deposit': 'security_deposit',
      'rent_hike': 'rent_hike',
      'lock_in_penalty': 'lock_in_penalty',
      'termination': 'other',
      'maintenance': 'other',
      'utilities': 'other',
      'subletting': 'other',
      'other': 'other'
    }
    return typeMap[type?.toLowerCase()] || 'other'
  }

  private calculateConfidence(clause: ProblematicClause): number {
    // Calculate confidence based on various factors
    let confidence = 0.5
    
    if (clause.legalBasis) confidence += 0.2
    if (clause.suggestion) confidence += 0.1
    if (clause.riskLevel === 'high') confidence += 0.15
    else if (clause.riskLevel === 'medium') confidence += 0.05
    
    return Math.min(confidence, 1.0)
  }

  private findTextPosition(clauseText: string, fullText: string): { x: number, y: number, width: number, height: number } {
    // Simple position calculation based on text location
    const index = fullText.toLowerCase().indexOf(clauseText?.toLowerCase() || '')
    const lineNumber = fullText.substring(0, index).split('\n').length
    
    return {
      x: 0,
      y: lineNumber * 20, // Approximate line height
      width: 100,
      height: 40
    }
  }

  private calculateOverallRisk(clauses: ClauseResult[]): number {
    if (clauses.length === 0) return 0
    
    let totalRisk = 0
    clauses.forEach(clause => {
      const riskMultiplier = clause.riskLevel === 'high' ? 3 : 
                            clause.riskLevel === 'medium' ? 2 : 1
      totalRisk += (clause.confidence * riskMultiplier * 10)
    })
    
    return Math.min(Math.round(totalRisk / clauses.length * 10), 100)
  }

  private generateSummary(clauses: ClauseResult[], governmentType: GovernmentType): string {
    const highRiskCount = clauses.filter(c => c.riskLevel === 'high').length
    const mediumRiskCount = clauses.filter(c => c.riskLevel === 'medium').length
    
    let summary = `Document analysis complete. Found ${clauses.length} problematic clause(s): `
    summary += `${highRiskCount} high-risk, ${mediumRiskCount} medium-risk. `
    
    if (governmentType !== 'general') {
      summary += `Analysis performed according to ${governmentType.toUpperCase()} regulations. `
    }
    
    if (highRiskCount > 0) {
      summary += `CAUTION: This document contains high-risk clauses that may be unfair or illegal. Legal consultation recommended.`
    }
    
    return summary
  }

  async getDetailedExplanation(clause: ClauseResult, language: 'en' | 'hi' = 'en'): Promise<string> {
    const prompt = `
    Explain this legal clause in simple ${language === 'hi' ? 'Hindi' : 'English'} for a layperson:
    
    Clause: "${clause.text}"
    Type: ${clause.type}
    Risk Level: ${clause.riskLevel}
    Issue: ${clause.reason}
    
    Provide:
    1. What this clause means in simple terms
    2. Why it might be problematic
    3. What the tenant should know
    4. Suggested negotiation points
    
    Keep the explanation under 200 words and use simple language.
    `

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (error) {
      console.error('Error getting detailed explanation:', error)
      return language === 'hi' 
        ? 'विस्तृत विवरण उपलब्ध नहीं है।' 
        : 'Detailed explanation not available.'
    }
  }

  async compareWithStandardAgreement(
    documentText: string,
    governmentType: GovernmentType = 'general'
  ): Promise<{
    deviations: string[]
    missingClauses: string[]
    recommendations: string[]
  }> {
    const prompt = `
    Compare this rental agreement with standard ${governmentType !== 'general' ? governmentType.toUpperCase() : ''} rental agreement templates:
    
    Document: "${documentText}"
    
    Identify:
    1. Major deviations from standard agreements
    2. Important missing clauses that protect tenant rights
    3. Recommendations for improvement
    
    Format as JSON:
    {
      "deviations": ["list of deviations"],
      "missingClauses": ["list of missing important clauses"],
      "recommendations": ["list of recommendations"]
    }
    `

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('Error comparing with standard agreement:', error)
    }

    return {
      deviations: [],
      missingClauses: [],
      recommendations: []
    }
  }
}

// Export singleton instance
export const geminiAnalyzer = new GeminiLegalAnalyzer()