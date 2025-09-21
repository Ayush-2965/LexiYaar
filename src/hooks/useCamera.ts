'use client'

import { useRef, useState, useCallback } from 'react'

interface CameraState {
  isActive: boolean
  isReady: boolean
  error: string | null
  currentFacingMode: 'environment' | 'user'
}

interface UseCameraReturn extends CameraState {
  videoRef: React.RefObject<HTMLVideoElement | null>
  startCamera: () => Promise<void>
  stopCamera: () => void
  switchCamera: () => void
  captureImage: () => Promise<{ file: File; dataUrl: string } | null>
}

export const useCamera = (): UseCameraReturn => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isInitializingRef = useRef(false)
  
  const [state, setState] = useState<CameraState>({
    isActive: false,
    isReady: false,
    error: null,
    currentFacingMode: 'environment'
  })

  const startCamera = useCallback(async () => {
    // Prevent concurrent initializations
    if (isInitializingRef.current || streamRef.current) {
      console.log('Camera already initializing or active')
      return
    }

    isInitializingRef.current = true

    try {
      console.log('Starting camera with facing mode:', state.currentFacingMode)
      
      setState(prev => ({ ...prev, error: null, isActive: true, isReady: false }))

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: state.currentFacingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          console.log('Camera ready')
          setState(prev => ({ ...prev, isReady: true }))
        }
        videoRef.current.onerror = (err) => {
          console.error('Video element error:', err)
          setState(prev => ({ ...prev, error: 'Failed to display camera feed' }))
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera'
      console.error('Camera error:', err)
      setState(prev => ({ ...prev, error: errorMessage, isActive: false }))
    } finally {
      isInitializingRef.current = false
    }
  }, [state.currentFacingMode])

  const stopCamera = useCallback(() => {
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

    setState(prev => ({ ...prev, isActive: false, isReady: false }))
    isInitializingRef.current = false
  }, [])

  const switchCamera = useCallback(() => {
    if (!state.isActive) return

    const newFacingMode = state.currentFacingMode === 'environment' ? 'user' : 'environment'
    console.log('Switching camera from', state.currentFacingMode, 'to', newFacingMode)
    
    setState(prev => ({ ...prev, currentFacingMode: newFacingMode }))
    
    // Stop current stream and restart with new facing mode
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setState(prev => ({ ...prev, isReady: false }))
      
      // Restart with new facing mode after a short delay
      setTimeout(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: newFacingMode,
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          })
          
          streamRef.current = stream
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.onloadedmetadata = () => {
              console.log('Camera switched successfully to:', newFacingMode)
              setState(prev => ({ ...prev, isReady: true }))
            }
          }
        } catch (err) {
          console.error('Camera switch error:', err)
          setState(prev => ({ 
            ...prev, 
            error: 'Failed to switch camera', 
            isActive: false 
          }))
        }
      }, 200)
    }
  }, [state.isActive, state.currentFacingMode])

  const captureImage = useCallback(async (): Promise<{ file: File; dataUrl: string } | null> => {
    if (!videoRef.current || !state.isReady) {
      console.log('Cannot capture - camera not ready')
      return null
    }

    console.log('Capturing from camera stream')
    const canvas = document.createElement('canvas')
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Could not get canvas context')
      return null
    }

    ctx.drawImage(video, 0, 0)
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Could not create blob from canvas')
          resolve(null)
          return
        }

        const file = new File([blob], `scan_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`, {
          type: 'image/jpeg'
        })

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        
        console.log('Image captured successfully')
        resolve({ file, dataUrl })
      }, 'image/jpeg', 0.9)
    })
  }, [state.isReady])

  return {
    ...state,
    videoRef,
    startCamera,
    stopCamera,
    switchCamera,
    captureImage
  }
}