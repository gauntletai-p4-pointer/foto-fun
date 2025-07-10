import { useEffect, useState } from 'react'
import { useService } from '@/lib/core/ServiceContainer'
import type { TypedCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'

/**
 * Hook to check if the canvas is ready for use
 */
export function useCanvasReady() {
  const [isReady, setIsReady] = useState(false)
  const canvasStore = useService<TypedCanvasStore>('CanvasStore')
  
  useEffect(() => {
    if (!canvasStore) {
      setIsReady(false)
      return
    }
    
    // Check if canvas is initialized
    const checkReady = () => {
      const state = canvasStore.getState()
      setIsReady(state.width > 0 && state.height > 0 && !state.isLoading)
    }
    
    // Initial check
    checkReady()
    
    // Subscribe to canvas changes
    const unsubscribe = canvasStore.subscribe((state) => {
      setIsReady(state.width > 0 && state.height > 0 && !state.isLoading)
    })
    
    return unsubscribe
  }, [canvasStore])
  
  return isReady
} 