'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next';
import { useSearchParams, useRouter } from 'next/navigation'
import { Camera, Upload, X, RotateCcw, Check, ArrowLeft, Loader2, SwitchCamera, FileText } from 'lucide-react'
import Button from './Button'
import { ocrService, resizeImage, fileToDataURL, OCRProgress } from '@/lib/ocr'
import { pdfProcessor } from '@/lib/pdf'
import { franc } from 'franc'
import Image from 'next/image'
import { Capacitor } from '@capacitor/core';
import { DocumentScanner } from '@capacitor-mlkit/document-scanner';

interface CapturedImage {
  file?: File
  dataUrl: string
  name: string
  isPDF?: boolean
  pageCount?: number
}

export default function ScanPage() {
  const { t } = useTranslation();
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
  
  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('ScanPage state update:', {
      cameraActive,
      cameraReady,
      currentCamera,
      hasStream: !!streamRef.current,
      capturedImagesCount: capturedImages.length
    })
  }, [cameraActive, cameraReady, currentCamera, capturedImages.length])

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

  // Start camera stream - removed useCallback to prevent dependency issues
  const startCamera = async () => {
    // Prevent multiple camera initializations
    if (streamRef.current) {
      console.log('Camera already active, skipping initialization')
      return
    }
    
    try {
      console.log('Starting camera with facing mode:', currentCamera)
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
          console.log('Camera ready')
          setCameraReady(true)
        }
        // Add error handling for video element
        videoRef.current.onerror = (err) => {
          console.error('Video element error:', err)
          setError(t('failedToDisplayCamera'))
        }
      }
    } catch (err) {
      setError(t('failedToAccessCamera'))
      setCameraActive(false)
      console.error('Camera error:', err)
    }
  }

  // Stop camera stream - removed useCallback to prevent dependency issues
  const stopCamera = () => {
    console.log('Stopping camera')
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind, track.label)
        track.stop()
      })
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setCameraActive(false)
    setCameraReady(false)
  }

  // Switch camera - removed useCallback to prevent dependency issues
  const switchCamera = () => {
    console.log('Switching camera from', currentCamera)
    setCurrentCamera(prev => prev === 'environment' ? 'user' : 'environment')
  }

  // Capture from live stream - removed useCallback to prevent dependency issues
  const captureFromStream = () => {
    if (!videoRef.current || !cameraReady) {
      console.log('Cannot capture - camera not ready or video ref not available')
      return
    }

    console.log('Capturing from camera stream')
    const canvas = document.createElement('canvas')
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Could not get canvas context')
      return
    }

    ctx.drawImage(video, 0, 0)
    
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Could not create blob from canvas')
        return
      }
      
      const file = new File([blob], `scan_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`, {
        type: 'image/jpeg'
      })
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      
      console.log('Image captured successfully')
      setCapturedImages(prev => [...prev, {
        file,
        dataUrl,
        name: file.name,
        isPDF: false
      }])
      
      stopCamera()
    }, 'image/jpeg', 0.9)
  }

  // Effect to restart camera when switching (only when currentCamera changes)
  useEffect(() => {
    // Only restart if camera is already active and we have a stream to replace
    if (cameraActive && streamRef.current) {
      console.log('Restarting camera for camera switch to:', currentCamera)
      
      // Stop current stream
      streamRef.current.getTracks().forEach(track => {
        console.log('Stopping track for camera switch:', track.kind, track.label)
        track.stop()
      })
      streamRef.current = null
      setCameraReady(false)
      
      // Start new stream with new camera
      const restartCamera = async () => {
        try {
          console.log('Getting new stream for camera:', currentCamera)
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
              console.log('Camera switched successfully to:', currentCamera)
              setCameraReady(true)
            }
          }
        } catch (err) {
          setError(t('failedToSwitchCamera'))
          setCameraActive(false)
          console.error('Camera switch error:', err)
        }
      }
      
      // Add a small delay to ensure the previous stream is fully stopped
      setTimeout(restartCamera, 200)
    }
  }, [currentCamera, cameraActive, t]) // Depend on currentCamera and cameraActive

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
          // For PDFs, convert all pages to images
          const pdfResult = await pdfProcessor.convertPDFToImages(file);
          // Add each page as a separate image
          pdfResult.images.forEach((imageData, index) => {
            newImages.push({
              file: index === 0 ? file : undefined, // Only store file reference for first page
              dataUrl: imageData,
              name: `${file.name} (Page ${index + 1})`,
              isPDF: true,
              pageCount: pdfResult.pageCount
            });
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
      const pages = [];
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
          ocrResult = await ocrService.extractParagraphs(fileToProcess, (progress: OCRProgress) => {
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
            'eng': 'eng', // English
            'hin': 'hin', // Hindi
            'ben': 'ben', // Bengali
            'guj': 'guj', // Gujarati
            'mar': 'mar', // Marathi
            'kan': 'kan', // Kannada
            'mal': 'mal', // Malayalam
            'tam': 'tam', // Tamil
            'tel': 'tel', // Telugu
            'pan': 'pan', // Punjabi
            'ori': 'ori', // Odia
            'asm': 'asm', // Assamese
            'bod': 'bod', // Bodo
            'doi': 'doi', // Dogri
            'gom': 'gom', // Konkani
            'kas': 'kas', // Kashmiri
            'kok': 'kok', // Konkani (Devanagari)
            'mai': 'mai', // Maithili
            'mni': 'mni', // Manipuri
            'nep': 'nep', // Nepali
            'san': 'san', // Sanskrit
            'snd': 'snd', // Sindhi
            'sat': 'sat', // Santali
            'urd': 'urd', // Urdu
            // Other supported languages
            'spa': 'spa', // Spanish
            'fra': 'fra', // French
            'deu': 'deu', // German
            'cmn': 'chi_sim' // Chinese (Simplified)
          };
          detectedLang = francToTess[langCode] || 'eng';
          if (detectedLang !== 'eng') {
            // Re-run OCR with detected language for better accuracy
            ocrResult = await ocrService.extractParagraphs(fileToProcess, (progress: OCRProgress) => {
              const overallProgress = (i / capturedImages.length) * 100 + progress.progress / capturedImages.length;
              setOcrProgress({
                status: `[${i + 1}/${capturedImages.length}] ${progress.status} (Detected: ${detectedLang})`,
                progress: Math.round(overallProgress)
              });
            });
          }
        } else {
          ocrResult = await ocrService.extractParagraphs(fileToProcess, (progress: OCRProgress) => {
            const overallProgress = (i / capturedImages.length) * 100 + progress.progress / capturedImages.length;
            setOcrProgress({
              status: `[${i + 1}/${capturedImages.length}] ${progress.status}`,
              progress: Math.round(overallProgress)
            });
          });
        }

        // Store individual page data
        pages.push({
          image: image.dataUrl,
          extractedText: ocrResult.fullText,
          paragraphs: ocrResult.paragraphs,
          confidence: ocrResult.confidence,
          pageNumber: i + 1
        });
      }

      setOcrProgress({ status: 'Processing results...', progress: 95 });

      sessionStorage.setItem('lexiyaar-document', JSON.stringify({
        pages: pages,
        filename: capturedImages.map(img => img.name).join(', '),
        processedAt: new Date().toISOString(),
        totalPages: pages.length
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

  // Handle native/web camera - with better error handling and state management
  const handleNativeCameraCapture = async () => {
    try {
      setError(null) // Clear any previous errors
      
      if (Capacitor.isNativePlatform()) {
        console.log('Using native document scanner')
        const result = await DocumentScanner.scanDocument({});
        if (result.scannedImages && result.scannedImages.length > 0) {
          const newImages = result.scannedImages.map((imageData, index) => ({
            file: undefined,
            dataUrl: imageData,
            name: `scan_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}_${index + 1}.jpg`,
            isPDF: false
          }));
          setCapturedImages(prev => [...prev, ...newImages]);
        }
      } else {
        console.log('Using web camera')
        // Make sure we're not already in camera mode
        if (!cameraActive && !streamRef.current) {
          await startCamera()
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera'
      setError(errorMessage)
      console.error('Camera error:', err)
      setCameraActive(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-black text-white p-4 max-w-md mx-auto md:max-w-2xl md:p-6 lg:max-w-3xl lg:p-8" style={{ minHeight: '100dvh' }}>
      <div className="flex items-center justify-between mb-4 sticky top-0 z-10 bg-black/90 backdrop-blur-md py-2">
        <button onClick={goBack} className="p-2 rounded-full hover:bg-gray-800">
          <ArrowLeft />
        </button>
        <h1 className="text-2xl font-bold text-white">
          {mode === 'camera' ? t('scanDocument') : t('uploadDocument')}
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
                {t('uploadDocument')}
              </p>
              <p className="text-xs text-gray-400">
                {t('uploadMultipleFiles')}
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
            {t('uploadDocument')}
          </Button>
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative bg-gray-800 px-4 text-sm text-gray-400">{t('autoDetect')}</div>
          </div>
          <Button
            variant="secondary"
            size="lg"
            onClick={handleNativeCameraCapture}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Camera className="mr-2" />
            {t('scanDocument')}
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
          <h3 className="text-base font-semibold mb-2">{t('preview')}</h3>
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
                {t('selectLanguage')}
              </label>
              <select
                id="lang-select"
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">{t('autoDetect')}</option>
                <option value="eng">{t('english')}</option>
                <option value="hin">{t('hindi')}</option>
                <option value="ben">{t('bengali')}</option>
                <option value="guj">{t('gujarati')}</option>
                <option value="mar">{t('marathi')}</option>
                <option value="kan">{t('kannada')}</option>
                <option value="mal">{t('malayalam')}</option>
                <option value="tam">{t('tamil')}</option>
                <option value="tel">{t('telugu')}</option>
                <option value="pan">{t('punjabi')}</option>
                <option value="ori">{t('odia')}</option>
                <option value="asm">{t('assamese')}</option>
                <option value="bod">{t('bodo')}</option>
                <option value="doi">{t('dogri')}</option>
                <option value="gom">{t('konkani')}</option>
                <option value="kas">{t('kashmiri')}</option>
                <option value="kok">{t('konkani')}</option>
                <option value="mai">{t('maithili')}</option>
                <option value="mni">{t('manipuri')}</option>
                <option value="nep">{t('nepali')}</option>
                <option value="san">{t('sanskrit')}</option>
                <option value="sind">{t('sindhi') || 'Sindhi'}</option>
                <option value="sat">{t('santali')}</option>
                <option value="urd">{t('urdu')}</option>
                <option value="spa">{t('spanish')}</option>
                <option value="fra">{t('french')}</option>
                <option value="deu">{t('german')}</option>
                <option value="chi_sim">{t('chinese')}</option>
              </select>
            </div>
            <Button onClick={processDocument} className="w-full bg-green-600 hover:bg-green-700 text-base py-3 md:py-4">
              <Check className="mr-2" />
              {t('processDocument')}
            </Button>
            <div className="flex space-x-2">
              <Button onClick={handleRetake} variant="secondary" className="w-full text-sm py-2">
                <RotateCcw className="mr-2" />
                {t('retake')}
              </Button>
               <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full text-sm py-2">
                <Upload className="mr-2" />
                {t('addMore')}
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
