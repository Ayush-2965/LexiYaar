import { Capacitor } from '@capacitor/core';
import { createWorker } from 'tesseract.js';
import { OCRResult } from '@/types';

export interface OCRProgress {
  status: string;
  progress: number;
}

export class OCRService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mlKitTextRecognition: any = null;
  private worker: Tesseract.Worker | null = null;
  private isNative = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isNative = Capacitor.isNativePlatform();
      if (this.isNative) {
        this.initializeMLKit();
      }
    }
  }

  private async initializeMLKit() {
    try {
      const { CapacitorPluginMlKitTextRecognition } = await import('@pantrist/capacitor-plugin-ml-kit-text-recognition');
      this.mlKitTextRecognition = CapacitorPluginMlKitTextRecognition;
    } catch (error) {
      console.warn('Google ML Kit Text Recognition not available:', error);
    }
  }

  private async initializeWorker() {
    if (!this.worker) {
      this.worker = await createWorker('eng');
    }
  }

  static isAvailable(): boolean {
    return true; // Always available, either native or fallback
  }

  async extractText(
    imageFile: File | string,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    try {
      onProgress?.({ status: 'processing', progress: 0 });

      if (this.isNative && this.mlKitTextRecognition) {
        // Use Google ML Kit on native platforms for better accuracy
        let imageData: string;
        if (typeof imageFile === 'string') {
          imageData = imageFile;
        } else {
          imageData = await fileToDataURL(imageFile);
        }

        const result = await this.mlKitTextRecognition.recognizeText({
          base64: imageData.split(',')[1], // Remove data:image/jpeg;base64, prefix
        });

        onProgress?.({ status: 'completed', progress: 100 });

        return {
          text: result.text.trim(),
          confidence: 0.9, // ML Kit doesn't provide confidence, assume high
          bbox: undefined,
        };
      } else {
        // Use Tesseract on web
        await this.initializeWorker();
        if (!this.worker) {
          throw new Error('Failed to initialize OCR worker');
        }

        let imageData: string;
        if (typeof imageFile === 'string') {
          imageData = imageFile;
        } else {
          imageData = await fileToDataURL(imageFile);
        }

        const result = await this.worker.recognize(imageData);

        onProgress?.({ status: 'completed', progress: 100 });

        return {
          text: result.data.text.trim(),
          confidence: result.data.confidence / 100, // Tesseract confidence is 0-100, normalize to 0-1
          bbox: undefined,
        };
      }
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractParagraphs(
    imageFile: File | string,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<{ paragraphs: string[], fullText: string, confidence: number }> {
    const result = await this.extractText(imageFile, onProgress);

    // Split text into paragraphs
    const paragraphs = result.text
      .split(/\n\s*\n/)
      .map(p => p.replace(/\n/g, ' ').trim())
      .filter(p => p.length > 10); // Filter out very short paragraphs

    return {
      paragraphs,
      fullText: result.text,
      confidence: result.confidence,
    };
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    // ML Kit doesn't need termination
  }
}

// Create singleton instance
export const ocrService = new OCRService();

// Helper function to convert file to data URL
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper function to resize image for better OCR performance
export function resizeImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      img.onload = () => {
        try {
          const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const resizedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(resizedFile);
              } else {
                console.warn('Failed to create blob, using original file');
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        } catch (error) {
          console.error('Error in image processing:', error);
          resolve(file); // Fallback to original file
        }
      };

      img.onerror = () => {
        console.error('Failed to load image for resizing');
        resolve(file); // Fallback to original file
      };

      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('Error setting up image resize:', error);
      resolve(file); // Fallback to original file
    }
  });
}