import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker with local file
if (typeof window !== 'undefined') {
  try {
    // Use local worker file from public directory
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
    console.log('PDF.js worker configured with local file')
  } catch (error) {
    console.warn('Failed to configure PDF.js worker:', error)
  }
}

export interface PDFProcessResult {
  images: string[]
  pageCount: number
  metadata?: Record<string, unknown> | null
}

export class PDFProcessor {
  async convertPDFToImages(file: File): Promise<PDFProcessResult> {
    try {
      console.log('Starting PDF processing for:', file.name, 'Size:', file.size)
      
      // Validate file type
      if (!this.isPDF(file)) {
        throw new Error('File is not a valid PDF')
      }
      
      // Check file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        throw new Error('PDF file is too large (max 20MB)')
      }
      
      const arrayBuffer = await file.arrayBuffer()
      console.log('ArrayBuffer created, size:', arrayBuffer.byteLength)
      
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      })
      
      const pdf = await loadingTask.promise
      console.log('PDF loaded successfully, pages:', pdf.numPages)
      
      const images: string[] = []
      const pageCount = pdf.numPages
      
      // Limit to first 5 pages to prevent memory issues
      const maxPages = Math.min(pageCount, 5)
      
      // Process each page
      for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
        try {
          console.log(`Processing page ${pageNumber}/${maxPages}`)
          const page = await pdf.getPage(pageNumber)
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          
          if (!context) {
            throw new Error('Failed to get canvas context')
          }
          
          // Set up the canvas with moderate scale for good quality and performance
          const viewport = page.getViewport({ scale: 1.5 })
          canvas.height = viewport.height
          canvas.width = viewport.width
          
          // Render the page
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise
          
          // Convert to data URL with good compression
          const imageData = canvas.toDataURL('image/jpeg', 0.85)
          images.push(imageData)
          
          console.log(`Page ${pageNumber} processed successfully`)
        } catch (pageError) {
          console.error(`Error processing page ${pageNumber}:`, pageError)
          // Continue with other pages if one fails
          continue
        }
      }
      
      if (images.length === 0) {
        throw new Error('No pages could be processed from the PDF. The PDF may be corrupted or use unsupported features.')
      }
      
      console.log(`PDF processing completed. ${images.length} pages processed.`)
      
      let metadata = null
      try {
        metadata = await pdf.getMetadata()
      } catch (metadataError) {
        console.warn('Could not retrieve PDF metadata:', metadataError)
      }
      
      return {
        images,
        pageCount: images.length,
        metadata
      }
    } catch (error) {
      console.error('PDF processing error:', error)
      if (error instanceof Error) {
        throw new Error(`Failed to process PDF: ${error.message}`)
      } else {
        throw new Error('Failed to process PDF file. This PDF may be corrupted or use unsupported features.')
      }
    }
  }
  
  async convertPDFPageToFile(file: File, pageIndex: number = 0): Promise<File> {
    try {
      const result = await this.convertPDFToImages(file)
      
      if (pageIndex >= result.images.length) {
        throw new Error(`Page ${pageIndex + 1} not found in PDF`)
      }
      
      // Convert data URL to blob
      const response = await fetch(result.images[pageIndex])
      const blob = await response.blob()
      
      // Create a new file from the blob
      return new File([blob], `${file.name}_page_${pageIndex + 1}.png`, {
        type: 'image/png',
        lastModified: Date.now()
      })
    } catch (error) {
      console.error('PDF to file conversion error:', error)
      throw new Error('Failed to convert PDF page to image')
    }
  }
  
  isPDF(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  }
}

// Export singleton instance
export const pdfProcessor = new PDFProcessor()