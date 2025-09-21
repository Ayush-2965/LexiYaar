'use client'

import React, { useState, useEffect } from 'react'
import { signIn, signUp, signOut, onAuthStateChanged, addDocument } from '@/lib/firebase'
import { clauseClassifier } from '@/lib/classifier'
import type { LegalAnalysisResult, ClauseResult, GovernmentType } from '@/types'

export default function ExampleUsage() {
  const [user, setUser] = useState<{ uid: string; email: string } | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [documentText, setDocumentText] = useState('')
  const [governmentType, setGovernmentType] = useState<GovernmentType>('india')
  const [analysisResult, setAnalysisResult] = useState<LegalAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    onAuthStateChanged((user) => {
      if (user && typeof user === 'object' && 'uid' in user && 'email' in user) {
        setUser({ uid: (user as { uid: string; email: string }).uid, email: (user as { uid: string; email: string }).email })
      } else {
        setUser(null)
      }
    })
    // onAuthStateChanged returns void, so no unsubscribe
  }, [])

  const handleSignUp = async () => {
    try {
      await signUp(email, password)
      alert('Sign up successful!')
    } catch (error) {
      const err = error as Error
      alert(`Sign up failed: ${err.message}`)
    }
  }

  const handleSignIn = async () => {
    try {
      await signIn(email, password)
      alert('Sign in successful!')
    } catch (error) {
      const err = error as Error
      alert(`Sign in failed: ${err.message}`)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      alert('Sign out successful!')
    } catch (error) {
      const err = error as Error
      alert(`Sign out failed: ${err.message}`)
    }
  }

  const handleAnalyzeDocument = async () => {
    if (!documentText.trim()) {
      alert('Please enter document text to analyze')
      return
    }

    setLoading(true)
    try {
      // Use the enhanced AI-powered classification
      const result = await clauseClassifier.classifyWithAI(documentText, governmentType)
      setAnalysisResult(result)
      
      // Save to Firebase if user is logged in
      if (user) {
        await addDocument('analyses', {
          userId: user.uid,
          documentText,
          governmentType,
          analysisResult: result,
          timestamp: new Date()
        })
      }
    } catch (error) {
      const err = error as Error
      alert(`Analysis failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const sampleDocument = `RENTAL AGREEMENT

This Agreement is made between the Landlord and Tenant for the property located at Mumbai, Maharashtra.

SECURITY DEPOSIT: The tenant shall pay a security deposit of Rs. 2,00,000 which will be forfeited if the tenant vacates before the lock-in period of 11 months. Any damages including normal wear and tear will be deducted from the deposit at the sole discretion of the landlord.

RENT INCREASE: The landlord reserves the right to increase the rent by any amount at any time without prior notice. The rent may be revised quarterly based on market conditions.

LOCK-IN PERIOD: The tenant must stay for a minimum of 11 months. If the tenant leaves before this period, the entire security deposit will be forfeited and the tenant must pay an additional penalty of 2 months rent.

TERMINATION: The landlord can terminate this agreement at any time with 7 days notice, while the tenant must give 3 months notice.`

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-30 w-full bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-xl backdrop-blur-md" style={{ WebkitBackdropFilter: 'blur(8px)' }}>
        <div className="flex items-center px-4 py-3 gap-3">
          <h1 className="text-lg sm:text-xl font-bold text-white flex-1">LexiYaar - Firebase & Gemini AI Integration Demo</h1>
        </div>
      </header>
      <div className="p-4 max-w-4xl mx-auto">
      
      {/* Authentication Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-xl font-semibold mb-3">Firebase Authentication</h2>
        
        {user ? (
          <div>
            <p className="text-green-600 mb-2">Logged in as: {user.email}</p>
            <button 
              onClick={handleSignOut}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <div className="flex gap-2">
              <button 
                onClick={handleSignIn}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Sign In
              </button>
              <button 
                onClick={handleSignUp}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Document Analysis Section */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-3">Gemini AI Legal Document Analysis</h2>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Government Type:</label>
            <select 
              value={governmentType}
              onChange={(e) => setGovernmentType(e.target.value as GovernmentType)}
              className="w-full p-2 border rounded"
            >
              <option value="india">India</option>
              <option value="us">United States</option>
              <option value="general">General</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Document Text:</label>
            <textarea
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Paste your legal document here..."
              className="w-full p-2 border rounded h-32"
            />
            <button
              onClick={() => setDocumentText(sampleDocument)}
              className="text-blue-500 text-sm mt-1"
            >
              Use Sample Document
            </button>
          </div>

          <button 
            onClick={handleAnalyzeDocument}
            disabled={loading}
            className={`w-full py-2 rounded text-white ${
              loading ? 'bg-gray-400' : 'bg-purple-500 hover:bg-purple-600'
            }`}
          >
            {loading ? 'Analyzing...' : 'Analyze Document with AI'}
          </button>
        </div>

        {/* Analysis Results */}
        {analysisResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Analysis Results</h3>
            
            <div className="space-y-2">
              <div>
                <span className="font-medium">Overall Risk Score:</span> 
                <span className={`ml-2 font-bold ${
                  analysisResult.overallRiskScore > 70 ? 'text-red-500' :
                  analysisResult.overallRiskScore > 40 ? 'text-yellow-500' :
                  'text-green-500'
                }`}>
                  {analysisResult.overallRiskScore}/100
                </span>
              </div>

              <div>
                <span className="font-medium">Compliance:</span> 
                <span className={`ml-2 ${
                  analysisResult.governmentCompliance.compliant ? 'text-green-500' : 'text-red-500'
                }`}>
                  {analysisResult.governmentCompliance.compliant ? 'Compliant' : 'Non-Compliant'}
                </span>
              </div>

              <div>
                <span className="font-medium">Summary:</span>
                <p className="text-sm mt-1">{analysisResult.summary}</p>
              </div>

              {analysisResult.governmentCompliance.violations.length > 0 && (
                <div>
                  <span className="font-medium">Violations:</span>
                  <ul className="list-disc list-inside text-sm mt-1">
                    {analysisResult.governmentCompliance.violations.map((v: string, i: number) => (
                      <li key={i} className="text-red-600">{v}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisResult.clauses.length > 0 && (
                <div>
                  <span className="font-medium">Problematic Clauses Found:</span>
                  <div className="space-y-2 mt-2">
                    {analysisResult.clauses.map((clause: ClauseResult) => (
                      <div key={clause.id} className="border-l-4 pl-3 py-2" 
                        style={{borderColor: 
                          clause.riskLevel === 'high' ? '#ef4444' :
                          clause.riskLevel === 'medium' ? '#f59e0b' : '#10b981'
                        }}>
                        <div className="font-medium text-sm">
                          {clause.type.replace('_', ' ').toUpperCase()} - {clause.riskLevel.toUpperCase()} Risk
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{clause.reason}</div>
                        {clause.legalBasis && (
                          <div className="text-xs text-blue-600 mt-1">Law: {clause.legalBasis}</div>
                        )}
                        {clause.suggestion && (
                          <div className="text-xs text-green-600 mt-1">Suggestion: {clause.suggestion}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysisResult.governmentCompliance.recommendations.length > 0 && (
                <div>
                  <span className="font-medium">Recommendations:</span>
                  <ul className="list-disc list-inside text-sm mt-1">
                    {analysisResult.governmentCompliance.recommendations.map((r: string, i: number) => (
                      <li key={i} className="text-blue-600">{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}