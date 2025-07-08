import { useEffect, useState } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import type { Canvas } from 'fabric'

export interface CanvasReadyState {
  isReady: boolean
  isLoading: boolean
  error: Error | null
  canvas: Canvas | null
}

/**
 * Hook to check and wait for canvas readiness
 * Provides a clean interface for components that need canvas access
 */
export function useCanvasReady(): CanvasReadyState {
  const { fabricCanvas, isReady, initializationError, waitForReady } = useCanvasStore()
  const [isLoading, setIsLoading] = useState(!isReady)
  const [error, setError] = useState<Error | null>(initializationError)
  
  useEffect(() => {
    if (isReady) {
      setIsLoading(false)
      setError(null)
      return
    }
    
    if (initializationError) {
      setIsLoading(false)
      setError(initializationError)
      return
    }
    
    // Wait for canvas to be ready
    setIsLoading(true)
    waitForReady()
      .then(() => {
        setIsLoading(false)
        setError(null)
      })
      .catch((err) => {
        setIsLoading(false)
        setError(err instanceof Error ? err : new Error('Canvas initialization failed'))
      })
  }, [isReady, initializationError, waitForReady])
  
  return {
    isReady,
    isLoading,
    error,
    canvas: isReady ? fabricCanvas : null
  }
}

/**
 * Hook that throws a promise while canvas is loading
 * Useful for React Suspense integration
 */
export function useCanvasReadyOrThrow(): Canvas {
  const { fabricCanvas, isReady, waitForReady } = useCanvasStore()
  
  if (!isReady) {
    throw waitForReady()
  }
  
  if (!fabricCanvas) {
    throw new Error('Canvas is not available')
  }
  
  return fabricCanvas
} 