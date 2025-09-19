'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Camera, Upload, X, RotateCcw, Check, ArrowLeft, Loader2, SwitchCamera, FileText } from 'lucide-react'
import Button from './Button'
import { ocrService, resizeImage, fileToDataURL, OCRProgress } from '@/lib/ocr'
import { pdfProcessor } from '@/lib/pdf'
import { formatFileSize } from '@/lib/utils'

interface CapturedImage {
  file: File
  dataUrl: string
  name: string
  isPDF?: boolean
  pageCount?: number
}

interface PDFPageSelection {
  images: string[]
  selectedPage: number
}

export default function ScanPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = searchParams.get('mode') || 'camera'
  
  const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pdfPages, setPdfPages] = useState<PDFPageSelection | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [currentCamera, setCurrentCamera] = useState<'environment' | 'user'>('environment')
  const [supportsCameraSwitch, setSupportsCameraSwitch] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Check if camera switching is supported
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameras = devices.filter(device => device.kind === 'videoinput')
        setSupportsCameraSwitch(cameras.length > 1)
      } catch (err) {
        console.error('Error checking camera support:', err)
      }
    }
    
    if (mode === 'camera') {
      checkCameraSupport()
    }
  }, [mode])

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setCameraActive(true)
      setCameraReady(false)
      setError(null)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: currentCamera,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })

      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true)
        }
      }
    } catch (err) {
      setError('Failed to access camera. Please check permissions.')
      setCameraActive(false)
      console.error('Camera error:', err)
    }
  }, [currentCamera])

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
    setCameraReady(false)
  }, [])

  // Switch camera
  const switchCamera = useCallback(() => {
    setCurrentCamera(prev => prev === 'environment' ? 'user' : 'environment')
  }, [])

  // Capture from live stream
  const captureFromStream = useCallback(() => {
    if (!videoRef.current || !cameraReady) return

    const canvas = document.createElement('canvas')
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    
    canvas.toBlob((blob) => {
      if (!blob) return
      
      const file = new File([blob], `scan_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`, {
        type: 'image/jpeg'
      })
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      
      setCapturedImage({
        file,
        dataUrl,
        name: file.name,
        isPDF: false
      })
      
      stopCamera()
    }, 'image/jpeg', 0.9)
  }, [cameraReady, stopCamera])

  // Effect to restart camera when switching
  useEffect(() => {
    if (cameraActive) {
      stopCamera()
      setTimeout(() => startCamera(), 100)
    }
  }, [currentCamera, cameraActive, startCamera, stopCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Handle file selection from device
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const validPdfTypes = ['application/pdf']
    const allValidTypes = [...validImageTypes, ...validPdfTypes]
    
    if (!allValidTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid image file (JPEG, PNG, WebP) or PDF document')
      return
    }

    // Validate file size (max 20MB for PDFs, 10MB for images)
    const maxSize = pdfProcessor.isPDF(file) ? 20 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError(`File size must be less than ${pdfProcessor.isPDF(file) ? '20MB' : '10MB'}`)
      return
    }

    setError(null)
    
    try {
      if (pdfProcessor.isPDF(file)) {
        // Handle PDF file
        console.log('Processing PDF file:', file.name, 'Size:', formatFileSize(file.size))
        
        // Show loading state while processing PDF
        setIsProcessing(true)
        setOcrProgress({ status: 'Converting PDF to images...', progress: 20 })
        
        try {
          const pdfResult = await pdfProcessor.convertPDFToImages(file)
          
          setOcrProgress({ status: 'PDF converted successfully', progress: 100 })
          
          setPdfPages({
            images: pdfResult.images,
            selectedPage: 0
          })
          setCapturedImage({
            file,
            dataUrl: pdfResult.images[0], // Show first page
            name: file.name,
            isPDF: true,
            pageCount: pdfResult.pageCount
          })
          
          console.log(`PDF processed successfully: ${pdfResult.pageCount} pages`)
        } catch (pdfError) {
          console.error('PDF processing failed:', pdfError)
          throw new Error(`PDF processing failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}. Please try with a different PDF file or convert it to an image first.`)
        }
        
        setIsProcessing(false)
        setOcrProgress(null)
      } else {
        // Handle image file
        console.log('Processing image file:', file.name)
        const dataUrl = await fileToDataURL(file)
        setCapturedImage({
          file,
          dataUrl,
          name: file.name,
          isPDF: false
        })
      }
    } catch (err) {
      setIsProcessing(false)
      setOcrProgress(null)
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to process file. Please try a different file.'
      setError(errorMessage)
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
    setOcrProgress({ status: 'Initializing OCR...', progress: 0 })

    try {
      console.log('Starting document processing for:', capturedImage.name)
      
      // For PDF, use the current selected page image directly
      let fileToProcess: File
      
      if (capturedImage.isPDF && pdfPages) {
        // Convert the current page image to file
        setOcrProgress({ status: 'Preparing PDF page...', progress: 10 })
        
        const response = await fetch(capturedImage.dataUrl)
        const blob = await response.blob()
        fileToProcess = new File([blob], `${capturedImage.name}_page_${pdfPages.selectedPage + 1}.jpg`, {
          type: 'image/jpeg'
        })
      } else {
        // Resize image for better OCR performance
        setOcrProgress({ status: 'Resizing image...', progress: 10 })
        fileToProcess = await resizeImage(capturedImage.file, 1200, 0.9)
      }
      
      console.log('File prepared for OCR:', fileToProcess.name, 'Size:', fileToProcess.size)
      
      // Extract text with progress tracking
      setOcrProgress({ status: 'Starting text extraction...', progress: 20 })
      
      const result = await ocrService.extractParagraphs(fileToProcess, (progress) => {
        // Map OCR progress to 20-90% range
        const mappedProgress = 20 + (progress.progress * 0.7)
        setOcrProgress({
          status: progress.status,
          progress: Math.round(mappedProgress)
        })
      })

      setOcrProgress({ status: 'Processing results...', progress: 95 })

      if (!result.fullText.trim()) {
        setError('No text found in the document. Please try with a clearer image or different document.')
        setIsProcessing(false)
        setOcrProgress(null)
        return
      }

      console.log('OCR completed successfully. Text length:', result.fullText.length)

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
      
      setOcrProgress({ status: 'Complete!', progress: 100 })
      
      // Small delay to show completion
      setTimeout(() => {
        router.push('/document')
      }, 500)
      
    } catch (err) {
      console.error('Document processing error:', err)
      
      const errorMessage = err instanceof Error 
        ? `OCR processing failed: ${err.message}` 
        : 'Failed to extract text from document. Please try again with a clearer image.'
      
      setError(errorMessage)
    } finally {
      setIsProcessing(false)
      setOcrProgress(null)
    }
  }, [capturedImage, pdfPages, router])

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
      if (!cameraActive) {
        startCamera()
      } else {
        cameraInputRef.current?.click()
      }
    } else {
      fileInputRef.current?.click()
    }
  }, [mode, cameraActive, startCamera])

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
            {/* Live Camera Preview */}
            {mode === 'camera' && cameraActive && (
              <div className="bg-white rounded-xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800">Camera Preview</h3>
                  <div className="flex gap-2">
                    {supportsCameraSwitch && (
                      <button
                        onClick={switchCamera}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        disabled={!cameraReady}
                      >
                        <SwitchCamera size={20} className="text-gray-600" />
                      </button>
                    )}
                    <button
                      onClick={stopCamera}
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <X size={20} className="text-gray-600" />
                    </button>
                  </div>
                </div>
                
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Loader2 size={32} className="animate-spin mx-auto mb-2" />
                        <p className="text-sm">Starting camera...</p>
                      </div>
                    </div>
                  )}
                  
                  {cameraReady && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <button
                        onClick={captureFromStream}
                        className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
                      >
                        <Camera size={24} className="text-gray-800" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* File Upload Interface */}
            {(!cameraActive || mode !== 'camera') && (
              <div className="bg-white rounded-xl p-8 shadow-lg text-center">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {mode === 'camera' ? (
                    <Camera size={40} className="text-red-600" />
                  ) : (
                    <Upload size={40} className="text-red-600" />
                  )}
                </div>
                
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  {mode === 'camera' ? 'Start Camera' : 'Select Document'}
                </h2>
                
                <p className="text-gray-600 mb-6">
                  {mode === 'camera'
                    ? 'Position the document clearly in frame'
                    : 'Choose an image file (JPG, PNG, WebP) or PDF document'
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
                      Start Camera
                    </>
                  ) : (
                    <>
                      <Upload size={24} />
                      Select File
                    </>
                  )}
                </Button>
              </div>
            )}

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
                {capturedImage.isPDF && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                    <FileText size={12} />
                    PDF
                  </div>
                )}
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

              {/* PDF Page Selection */}
              {capturedImage.isPDF && pdfPages && pdfPages.images.length > 1 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-3">
                    Select Page ({pdfPages.selectedPage + 1} of {pdfPages.images.length})
                  </h4>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {pdfPages.images.map((pageImage, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setPdfPages(prev => prev ? { ...prev, selectedPage: index } : null)
                          setCapturedImage(prev => prev ? { ...prev, dataUrl: pageImage } : null)
                        }}
                        className={`flex-shrink-0 w-16 h-20 border-2 rounded overflow-hidden transition-all ${
                          index === pdfPages.selectedPage
                            ? 'border-red-500 ring-2 ring-red-200'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <img
                          src={pageImage}
                          alt={`Page ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
          accept="image/*,application/pdf,.pdf"
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
