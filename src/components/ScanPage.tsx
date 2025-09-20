'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Camera, Upload, X, RotateCcw, Check, ArrowLeft, Loader2, SwitchCamera, FileText } from 'lucide-react'
import Button from './Button'
import { ocrService, resizeImage, fileToDataURL, OCRProgress } from '@/lib/ocr'
import { pdfProcessor } from '@/lib/pdf'
import { franc } from 'franc-min'
import Image from 'next/image'
import { Capacitor } from '@capacitor/core';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

interface CapturedImage {
  file?: File
  dataUrl: string
  name: string
  isPDF?: boolean
  pageCount?: number
}

export default function ScanPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = searchParams.get('mode') || 'camera'
  
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [currentCamera, setCurrentCamera] = useState<'environment' | 'user'>('environment')
  const [supportsCameraSwitch, setSupportsCameraSwitch] = useState(false)
  const [selectedLang, setSelectedLang] = useState('auto')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFileSelect(files);
    }
  };

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
      
      setCapturedImages(prev => [...prev, {
        file,
        dataUrl,
        name: file.name,
        isPDF: false
      }])
      
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
  const handleFileSelect = useCallback(async (files: FileList) => {
    if (!files || files.length === 0) return;

    const newImages: CapturedImage[] = [];
    const processingErrors: string[] = [];

    for (const file of Array.from(files)) {
      // Validate file type
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const validPdfTypes = ['application/pdf'];
      const allValidTypes = [...validImageTypes, ...validPdfTypes];
      
      if (!allValidTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
        processingErrors.push(`Invalid file type: ${file.name}`);
        continue;
      }

      // Validate file size (max 20MB for PDFs, 10MB for images)
      const maxSize = pdfProcessor.isPDF(file) ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        processingErrors.push(`File too large: ${file.name}`);
        continue;
      }

      try {
        if (pdfProcessor.isPDF(file)) {
          // For PDFs, we'll just add the first page for now.
          // A more advanced implementation could allow selecting which pages to import.
          const pdfResult = await pdfProcessor.convertPDFToImages(file);
          newImages.push({
            file,
            dataUrl: pdfResult.images[0],
            name: file.name,
            isPDF: true,
            pageCount: pdfResult.pageCount
          });
        } else {
          const dataUrl = await fileToDataURL(file);
          newImages.push({
            file,
            dataUrl,
            name: file.name,
            isPDF: false
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to process file.';
        processingErrors.push(`Error processing ${file.name}: ${errorMessage}`);
      }
    }

    setCapturedImages(prev => [...prev, ...newImages]);

    if (processingErrors.length > 0) {
      setError(processingErrors.join('\n'));
    } else {
      setError(null);
    }
  }, [])

  // Handle retake
  const handleRetake = () => {
    setCapturedImages([]);
    setError(null);
    setOcrProgress(null);
    if (mode === 'camera') {
      startCamera();
    }
  };

  // Process document with OCR
  const processDocument = useCallback(async () => {
    if (capturedImages.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setOcrProgress({ status: 'Initializing OCR...', progress: 0 });

    try {
      const allParagraphs: string[] = [];
      let totalConfidence = 0;
      let imageCount = 0;
      let detectedLang = 'eng';

      for (let i = 0; i < capturedImages.length; i++) {
        const image = capturedImages[i];
        setOcrProgress({ status: `Processing image ${i + 1} of ${capturedImages.length}`, progress: (i / capturedImages.length) * 100 });
        
        let fileToProcess: File;
        if (image.isPDF) {
          const response = await fetch(image.dataUrl);
          const blob = await response.blob();
          fileToProcess = new File([blob], `${image.name}_page_1.jpg`, { type: 'image/jpeg' });
        } else if (image.file) {
          fileToProcess = await resizeImage(image.file, 1200, 0.9);
        } else {
          // Skip if no file (native camera image)
          continue;
        }

        // If auto-detect, run OCR in English first, then detect language from text
        let ocrResult;
        if (selectedLang === 'auto') {
          ocrResult = await ocrService.extractParagraphs(fileToProcess, 'eng', (progress: OCRProgress) => {
            const overallProgress = (i / capturedImages.length) * 100 + progress.progress / capturedImages.length;
            setOcrProgress({
              status: `[${i + 1}/${capturedImages.length}] ${progress.status}`,
              progress: Math.round(overallProgress)
            });
          });
          // Use franc to detect language from extracted text
          const langCode = franc(ocrResult.fullText, { minLength: 10 });
          // Map franc code to tesseract code
          const francToTess: Record<string, string> = {
            'eng': 'eng', 'hin': 'hin', 'ben': 'ben', 'guj': 'guj', 'mar': 'mar', 'kan': 'kan', 'mal': 'mal', 'tam': 'tam', 'tel': 'tel', 'pan': 'pan', 'ori': 'ori',
            'spa': 'spa', 'fra': 'fra', 'deu': 'deu', 'cmn': 'chi_sim'
          };
          detectedLang = francToTess[langCode] || 'eng';
          if (detectedLang !== 'eng') {
            // Re-run OCR with detected language for better accuracy
            ocrResult = await ocrService.extractParagraphs(fileToProcess, detectedLang, (progress: OCRProgress) => {
              const overallProgress = (i / capturedImages.length) * 100 + progress.progress / capturedImages.length;
              setOcrProgress({
                status: `[${i + 1}/${capturedImages.length}] ${progress.status} (Detected: ${detectedLang})`,
                progress: Math.round(overallProgress)
              });
            });
          }
        } else {
          ocrResult = await ocrService.extractParagraphs(fileToProcess, selectedLang, (progress: OCRProgress) => {
            const overallProgress = (i / capturedImages.length) * 100 + progress.progress / capturedImages.length;
            setOcrProgress({
              status: `[${i + 1}/${capturedImages.length}] ${progress.status}`,
              progress: Math.round(overallProgress)
            });
          });
        }

        allParagraphs.push(...ocrResult.paragraphs);
        totalConfidence += ocrResult.confidence;
        imageCount++;
      }

      setOcrProgress({ status: 'Processing results...', progress: 95 });

      const averageConfidence = imageCount > 0 ? totalConfidence / imageCount : 0;

      const combinedText = allParagraphs.join('\n\n');

      sessionStorage.setItem('lexiyaar-document', JSON.stringify({
        image: capturedImages[0].dataUrl, // Use first image as preview
        extractedText: combinedText,
        paragraphs: allParagraphs,
        confidence: averageConfidence,
        filename: capturedImages.map(img => img.name).join(', '),
        processedAt: new Date().toISOString(),
      }));

      router.push('/document');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during OCR processing.';
      setError(errorMessage);
      console.error('OCR Error:', err);
    } finally {
      setIsProcessing(false);
      setOcrProgress(null);
    }
  }, [capturedImages, router, selectedLang])

  const resetState = useCallback(() => {
    setCapturedImages([])
    setIsProcessing(false)
    setOcrProgress(null)
    setError(null)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }, [])

  const goBack = () => {
    if (capturedImages.length > 0) {
      resetState()
    } else if (cameraActive) {
      stopCamera()
    } else {
      router.push('/')
    }
  }

  // Ensure removeImage is defined before use
  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Add this function to handle native/web camera
  const handleNativeCameraCapture = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const photo = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });
        setCapturedImages(prev => [...prev, {
          file: undefined,
          dataUrl: typeof photo.dataUrl === 'string' ? photo.dataUrl : '',
          name: `scan_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`,
          isPDF: false
        }]);
      } else {
        startCamera();
      }
    } catch (err) {
      setError('Failed to capture image');
      console.error('Camera error:', err);
    }
  }

  return (
    <div className="flex flex-col h-full bg-black text-white p-4 max-w-md mx-auto md:max-w-2xl md:p-6 lg:max-w-3xl lg:p-8" style={{ minHeight: '100dvh' }}>
      <div className="flex items-center justify-between mb-4 sticky top-0 z-10 bg-black/90 backdrop-blur-md py-2">
        <button onClick={goBack} className="p-2 rounded-full hover:bg-gray-800">
          <ArrowLeft />
        </button>
        <h1 className="text-2xl font-bold text-white">
          {mode === 'camera' ? 'Scan Document' : 'Upload Document'}
        </h1>
        <div className="w-10"></div>
      </div>

      {/* Main Content */}
      {!isProcessing && capturedImages.length === 0 && !cameraActive && (
        <div className="text-center space-y-6">
          <div className="p-4 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800">
            <div className="flex flex-col items-center space-y-2">
              <FileText size={36} className="text-gray-400" />
              <p className="text-base font-medium text-white">
                Select images or a PDF
              </p>
              <p className="text-xs text-gray-400">
                You can upload multiple files at once.
              </p>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            multiple
            onChange={handleFileChange}
          />
          <Button
            variant="primary"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="mr-2" />
            Select File(s)
          </Button>
          
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative bg-gray-800 px-4 text-sm text-gray-400">OR</div>
          </div>

          <Button
            variant="secondary"
            size="lg"
            onClick={handleNativeCameraCapture}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Camera className="mr-2" />
            Use Camera
          </Button>
        </div>
      )}

      {/* Camera View */}
      {cameraActive && (
        <div className="w-full max-w-lg mx-auto">
          <div className="relative w-full aspect-[9/16] bg-black rounded-lg overflow-hidden shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <Loader2 className="text-white animate-spin" size={48} />
              </div>
            )}
          </div>
          <div className="flex justify-center items-center gap-4 mt-4">
            <Button
              variant="secondary"
              size="icon"
              onClick={stopCamera}
            >
              <X />
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={captureFromStream}
              disabled={!cameraReady}
              className="rounded-full w-20 h-20 bg-blue-600 hover:bg-blue-700"
            >
              <Camera />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={switchCamera}
              disabled={!supportsCameraSwitch}
            >
              <SwitchCamera />
            </Button>
          </div>
        </div>
      )}

      {/* UI for displaying captured images */}
      {capturedImages.length > 0 && (
        <div className="mb-4 flex-grow overflow-y-auto">
          <h3 className="text-base font-semibold mb-2">Preview</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {capturedImages.map((image, index) => (
              <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-700">
                <Image
                  src={image.dataUrl}
                  alt={image.name}
                  width={320}
                  height={240}
                  className="w-full h-24 object-cover md:h-32 lg:h-36 transition-transform duration-200 group-hover:scale-105"
                  style={{ aspectRatio: '4/3' }}
                  unoptimized
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => removeImage(index)}
                    className="text-white bg-red-600 rounded-full p-2 shadow-lg"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 truncate mt-1 px-1">{image.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing UI */}
      {isProcessing && ocrProgress && (
        <div className="text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto md:w-32 md:h-32">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                className="text-gray-700"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
                r="45"
                cx="50"
                cy="50"
              />
              <circle
                className="text-red-600"
                strokeWidth="10"
                strokeDasharray={`${(2 * Math.PI * 45 * ocrProgress.progress) / 100} ${2 * Math.PI * 45}`}
                strokeDashoffset="0"
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="45"
                cx="50"
                cy="50"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-lg md:text-2xl font-bold text-white">
              {Math.round(ocrProgress.progress)}%
            </div>
          </div>
          <p className="text-base md:text-lg font-medium text-white">{ocrProgress.status}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-auto pt-4 border-t border-gray-800 bg-black/80 sticky bottom-0 z-10">
        {capturedImages.length > 0 && !isProcessing && (
          <div className="space-y-4">
             <div className="my-4">
              <label htmlFor="lang-select" className="block text-sm font-medium text-gray-400 mb-2">
                Select Document Language
              </label>
              <select
                id="lang-select"
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">Auto Detect</option>
                <option value="eng">English</option>
                <option value="hin">Hindi</option>
                <option value="ben">Bangla (Bengali)</option>
                <option value="guj">Gujarati</option>
                <option value="mar">Marathi</option>
                <option value="kan">Kannada</option>
                <option value="mal">Malayalam</option>
                <option value="tam">Tamil</option>
                <option value="tel">Telugu</option>
                <option value="pan">Punjabi</option>
                <option value="ori">Odia</option>
                <option value="spa">Spanish</option>
                <option value="fra">French</option>
                <option value="deu">German</option>
                <option value="chi_sim">Chinese (Simplified)</option>
              </select>
            </div>
            <Button onClick={processDocument} className="w-full bg-green-600 hover:bg-green-700 text-base py-3 md:py-4">
              <Check className="mr-2" />
              Process Document
            </Button>
            <div className="flex space-x-2">
              <Button onClick={handleRetake} variant="secondary" className="w-full text-sm py-2">
                <RotateCcw className="mr-2" />
                Retake
              </Button>
               <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full text-sm py-2">
                <Upload className="mr-2" />
                Add More
              </Button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
