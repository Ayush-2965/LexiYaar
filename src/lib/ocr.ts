import Tesseract from 'tesseract.js'
import { OCRResult } from '@/types'

export interface OCRProgress {
  status: string
  progress: number
}

export class OCRService {
  private worker: Tesseract.Worker | null = null
  private isInitialized = false
  private currentLang = 'eng'

  // Test if Tesseract is available
  static isAvailable(): boolean {
    try {
      return typeof Tesseract !== 'undefined' && typeof Tesseract.createWorker === 'function'
    } catch {
      return false
    }
  }

  async initialize(lang: string = 'eng', onProgress?: (progress: number) => void): Promise<void> {
    if (this.isInitialized && this.worker && this.currentLang === lang) {
      console.log(`OCR worker for ${lang} already initialized.`)
      return
    }

    // If worker exists but language is different, terminate it
    if (this.worker) {
      console.log(`Switching OCR language from ${this.currentLang} to ${lang}. Terminating existing worker.`)
      await this.worker.terminate()
      this.worker = null
      this.isInitialized = false
    }
    
    this.currentLang = lang;
    console.log(`Initializing OCR worker for language: ${lang}`)

    try {
      const onProgressCallback = onProgress || (() => {})
      let lastReportedProgress = -1

      this.worker = await Tesseract.createWorker(lang, 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100)
            if (progress > lastReportedProgress) {
              onProgressCallback(progress)
              lastReportedProgress = progress
            }
          }
        },
        errorHandler: (err) => {
          console.error("Tesseract worker error:", err);
          this.terminate(); // Terminate worker on error
        }
      })

      // No character whitelist for broader language support
      
      this.isInitialized = true
      console.log(`OCR worker for ${lang} initialized successfully.`)
    } catch (error) {
      console.error(`Failed to initialize OCR worker for language ${lang}:`, error)
      this.worker = null
      this.isInitialized = false
      throw new Error(`Could not initialize OCR service for language ${lang}.`)
    }
  }

  async extractText(
    imageFile: File | string,
    lang: string = 'eng',
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    try {
      console.log('Starting OCR text extraction...')
      onProgress?.({ status: 'initializing', progress: 0 })
      
      await this.initialize(lang, (p) => onProgress?.({ status: 'initializing', progress: p/2 }))

      if (!this.worker) {
        throw new Error('OCR worker not initialized')
      }

      // Set up progress callback if provided
      if (onProgress) {
        this.worker.setParameters({
          logger: (m: { status?: string; progress?: number }) => {
            console.log('OCR Progress:', m)
            if (m.status && m.progress !== undefined) {
              onProgress({
                status: m.status,
                progress: Math.round(m.progress * 100),
              })
            }
          },
        })
      }
      
      console.log('Starting OCR recognition...')
      
      // Add timeout to prevent infinite loading
      const recognitionPromise = this.worker.recognize(imageFile)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OCR processing timed out after 60 seconds')), 60000)
      })
      
      const result = await Promise.race([recognitionPromise, timeoutPromise]) as Tesseract.RecognizeResult

      console.log('OCR completed successfully')
      console.log('Extracted text length:', result.data.text.length)
      console.log('Confidence:', result.data.confidence)

      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence,
        bbox: undefined,
      }
    } catch (error) {
      console.error('OCR Error:', error)
      
      // Reset worker on error
      if (this.worker) {
        try {
          await this.worker.terminate()
        } catch (terminateError) {
          console.error('Error terminating worker:', terminateError)
        }
        this.worker = null
      }
      
      if (error instanceof Error) {
        throw new Error(`OCR processing failed: ${error.message}`)
      } else {
        throw new Error('Failed to extract text from image')
      }
    }
  }

  async extractParagraphs(
    imageFile: File | string,
    lang: string = 'eng',
    onProgress?: (progress: OCRProgress) => void
  ): Promise<{ paragraphs: string[], fullText: string, confidence: number }> {
    const result = await this.extractText(imageFile, lang, onProgress)
    
    // Split text into paragraphs
    const paragraphs = result.text
      .split(/\n\s*\n/)
      .map(p => p.replace(/\n/g, ' ').trim())
      .filter(p => p.length > 10) // Filter out very short paragraphs

    return {
      paragraphs,
      fullText: result.text,
      confidence: result.confidence,
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
    }
  }
}

// Create singleton instance
export const ocrService = new OCRService()

// Helper function to convert file to data URL
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Helper function to resize image for better OCR performance
export function resizeImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      img.onload = () => {
        try {
          const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
          canvas.width = img.width * ratio
          canvas.height = img.height * ratio

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const resizedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })
                resolve(resizedFile)
              } else {
                console.warn('Failed to create blob, using original file')
                resolve(file)
              }
            },
            'image/jpeg',
            quality
          )
        } catch (error) {
          console.error('Error in image processing:', error)
          resolve(file) // Fallback to original file
        }
      }

      img.onerror = () => {
        console.error('Failed to load image for resizing')
        resolve(file) // Fallback to original file
      }

      img.src = URL.createObjectURL(file)
    } catch (error) {
      console.error('Error setting up image resize:', error)
      resolve(file) // Fallback to original file
    }
  })
}