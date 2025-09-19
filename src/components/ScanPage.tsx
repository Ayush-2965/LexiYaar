'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Camera, Upload, X, RotateCcw, Check, ArrowLeft, Loader2 } from 'lucide-react'
import Button from './Button'
import { useLanguage } from '@/lib/language-context'
import { ocrService, resizeImage, fileToDataURL, OCRProgress } from '@/lib/ocr'
import { formatFileSize } from '@/lib/utils'

interface CapturedImage {
  file: File
  dataUrl: string
  name: string
}

export default function ScanPage() {
  const { language, t } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = searchParams.get('mode') || 'camera'
  
  const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection from device
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, WebP)')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setError(null)
    
    try {
      const dataUrl = await fileToDataURL(file)
      setCapturedImage({
        file,
        dataUrl,
        name: file.name
      })
    } catch (err) {
      setError('Failed to process image')
      console.error('File processing error:', err)
    }
  }, [])

  // Handle camera capture
  const handleCameraCapture = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    
    try {
      const dataUrl = await fileToDataURL(file)
      setCapturedImage({
        file,
        dataUrl,
        name: `scan_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`
      })
    } catch (err) {
      setError('Failed to process camera image')
      console.error('Camera processing error:', err)
    }
  }, [])

  // Process document with OCR
  const processDocument = useCallback(async () => {
    if (!capturedImage) return

    setIsProcessing(true)
    setError(null)
    setOcrProgress({ status: 'Initializing...', progress: 0 })

    try {
      // Resize image for better OCR performance
      const resizedFile = await resizeImage(capturedImage.file, 1200, 0.9)
      
      // Extract text with progress tracking
      const result = await ocrService.extractParagraphs(resizedFile, (progress) => {
        setOcrProgress(progress)
      })

      if (!result.fullText.trim()) {
        setError('No text found in the document. Please try with a clearer image.')
        setIsProcessing(false)
        return
      }

      // Store document data for analysis
      const documentData = {
        image: capturedImage.dataUrl,
        extractedText: result.fullText,
        paragraphs: result.paragraphs,
        confidence: result.confidence,
        filename: capturedImage.name,
        processedAt: new Date().toISOString()
      }

      // Store in sessionStorage for the document viewer
      sessionStorage.setItem('lexiyaar-document', JSON.stringify(documentData))
      
      // Navigate to document analysis
      router.push('/document')
    } catch (err) {
      setError('Failed to extract text from document. Please try again.')
      console.error('OCR processing error:', err)
    } finally {
      setIsProcessing(false)
      setOcrProgress(null)
    }
  }, [capturedImage, router])

  // Reset capture
  const resetCapture = useCallback(() => {
    setCapturedImage(null)
    setError(null)
    setOcrProgress(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }, [])

  // Trigger appropriate input based on mode
  const triggerInput = useCallback(() => {
    if (mode === 'camera') {
      cameraInputRef.current?.click()
    } else {
      fileInputRef.current?.click()
    }
  }, [mode])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      {/* Header */}
      <header className="bg-red-600 text-white p-4 shadow-lg">
        <div className="flex items-center gap-4 max-w-md mx-auto">
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center w-10 h-10 bg-red-700 hover:bg-red-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">Document Scanner</h1>
            <p className="text-sm opacity-90">
              {mode === 'camera' ? 'Camera Capture' : 'Upload File'}
            </p>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-md mx-auto">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Capture Interface */}
        {!capturedImage && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-8 shadow-lg text-center">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {mode === 'camera' ? (
                  <Camera size={40} className="text-red-600" />
                ) : (
                  <Upload size={40} className="text-red-600" />
                )}
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {mode === 'camera' ? 'Take a Photo' : 'Select Document'}
              </h2>
              
              <p className="text-gray-600 mb-6">
                {mode === 'camera'
                  ? 'Position the document clearly in frame'
                  : 'Choose an image file from your device'
                }
              </p>

              <Button
                size="xl"
                onClick={triggerInput}
                className="w-full h-16 text-lg"
              >
                {mode === 'camera' ? (
                  <>
                    <Camera size={24} />
                    Open Camera
                  </>
                ) : (
                  <>
                    <Upload size={24} />
                    Select File
                  </>
                )}
              </Button>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="font-bold text-gray-800 mb-3">Tips for better results:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">•</span>
                  Ensure good lighting and avoid shadows
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">•</span>
                  Keep the document flat and in focus
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">•</span>
                  Include the entire document in frame
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">•</span>
                  Use high-resolution images when possible
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Image Preview & Processing */}
        {capturedImage && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-800">Document Preview</h3>
                  <p className="text-sm text-gray-600">
                    {capturedImage.name} ({formatFileSize(capturedImage.file.size)})
                  </p>
                </div>
                <button
                  onClick={resetCapture}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={isProcessing}
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              
              <div className="relative">
                <img
                  src={capturedImage.dataUrl}
                  alt="Captured document"
                  className="w-full max-h-64 object-contain rounded-lg border"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                    <div className="bg-white rounded-lg p-4 text-center">
                      <Loader2 size={32} className="animate-spin text-red-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-800">
                        {ocrProgress?.status || 'Processing...'}
                      </p>
                      {ocrProgress && (
                        <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-red-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${ocrProgress.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={resetCapture}
                disabled={isProcessing}
                className="flex-1 h-14"
              >
                <RotateCcw size={20} />
                Retake
              </Button>
              
              <Button
                onClick={processDocument}
                disabled={isProcessing}
                className="flex-1 h-14"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Analyze Document
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Hidden Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraCapture}
          className="hidden"
        />
      </main>
    </div>
  )
}
