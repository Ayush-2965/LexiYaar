'use client'

export interface CameraConfig {
  facingMode?: 'user' | 'environment'
  width?: number
  height?: number
  quality?: number
}

export class CameraService {
  private stream: MediaStream | null = null
  private video: HTMLVideoElement | null = null

  async initializeCamera(config: CameraConfig = {}): Promise<HTMLVideoElement> {
    try {
      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device')
      }

      // Request camera permission and stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: config.facingMode || 'environment', // Prefer back camera for documents
          width: { ideal: config.width || 1920 },
          height: { ideal: config.height || 1080 }
        },
        audio: false
      })

      // Create video element
      this.video = document.createElement('video')
      this.video.srcObject = this.stream
      this.video.autoplay = true
      this.video.playsInline = true
      this.video.muted = true

      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        if (!this.video) {
          reject(new Error('Failed to create video element'))
          return
        }

        this.video.onloadedmetadata = () => resolve(true)
        this.video.onerror = () => reject(new Error('Failed to load camera stream'))
      })

      return this.video
    } catch {
      console.error('Camera initialization error:')
      throw new Error('Failed to access camera. Please check permissions.')
    }
  }

  capturePhoto(quality: number = 0.9): Promise<File> {
    return new Promise((resolve, reject) => {
      if (!this.video || !this.stream) {
        reject(new Error('Camera not initialized'))
        return
      }

      try {
        // Create canvas to capture frame
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')!
        
        // Set canvas dimensions to video dimensions
        canvas.width = this.video.videoWidth
        canvas.height = this.video.videoHeight
        
        // Draw current video frame to canvas
        context.drawImage(this.video, 0, 0, canvas.width, canvas.height)
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], `camera_${Date.now()}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              resolve(file)
            } else {
              reject(new Error('Failed to capture image'))
            }
          },
          'image/jpeg',
          quality
        )
      } catch {
        reject(new Error('Failed to capture photo'))
      }
    })
  }

  switchCamera(): Promise<HTMLVideoElement> {
    const currentFacingMode = this.getCurrentFacingMode()
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user'
    
    this.stopCamera()
    return this.initializeCamera({ facingMode: newFacingMode })
  }

  private getCurrentFacingMode(): 'user' | 'environment' {
    if (!this.stream) return 'environment'
    
    const videoTrack = this.stream.getVideoTracks()[0]
    const settings = videoTrack.getSettings()
    return settings.facingMode as 'user' | 'environment' || 'environment'
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    
    if (this.video) {
      this.video.srcObject = null
      this.video = null
    }
  }

  isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }

  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.filter(device => device.kind === 'videoinput')
    } catch (error) {
      console.error('Failed to get camera devices:', error)
      return []
    }
  }
}

// Export singleton instance
export const cameraService = new CameraService()