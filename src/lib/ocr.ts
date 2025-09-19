import Tesseract from 'tesseract.js'
import { OCRResult } from '@/types'

export interface OCRProgress {
  status: string
  progress: number
}

export class OCRService {
  private worker: Tesseract.Worker | null = null

  async initialize(): Promise<void> {
    if (this.worker) return

    this.worker = await Tesseract.createWorker('eng+hin', 1, {
      logger: () => {}, // Disable default logging
    })

    await this.worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?()[]{}"-_ \u0900-\u097F', // Include Devanagari characters
    })
  }

  async extractText(
    imageFile: File | string,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    await this.initialize()

    if (!this.worker) {
      throw new Error('OCR worker not initialized')
    }

    try {
      // Set up progress callback if provided
      if (onProgress && this.worker) {
        this.worker.setParameters({
          logger: (m: { status?: string; progress?: number }) => {
            if (m.status && m.progress !== undefined) {
              onProgress({
                status: m.status,
                progress: Math.round(m.progress * 100),
              })
            }
          },
        })
      }
      
      const result = await this.worker.recognize(imageFile)

      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence,
        // bbox property varies by Tesseract version
        bbox: undefined,
      }
    } catch (error) {
      console.error('OCR Error:', error)
      throw new Error('Failed to extract text from image')
    }
  }

  async extractParagraphs(
    imageFile: File | string,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<{ paragraphs: string[], fullText: string, confidence: number }> {
    const result = await this.extractText(imageFile, onProgress)
    
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
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()

    img.onload = () => {
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
            resolve(file)
          }
        },
        'image/jpeg',
        quality
      )
    }

    img.src = URL.createObjectURL(file)
  })
}