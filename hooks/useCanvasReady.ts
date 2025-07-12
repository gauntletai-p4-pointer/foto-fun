import { useEffect, useState } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import type { TypedCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'

/**
 * Hook to check if the canvas is ready for use
 */
export function useCanvasReady() {
  const [isReady, setIsReady] = useState(false)
  const canvasStore = useService<TypedCanvasStore>('CanvasStore')
  const canvasManager = useService<CanvasManager>('CanvasManager')
  
  useEffect(() => {
    if (!canvasStore || !canvasManager) {
      setIsReady(false)
      return
    }
    
    // Check if canvas is initialized
    const checkReady = () => {
      const state = canvasStore.getState()
      const hasKonvaStage = !!canvasManager.konvaStage
      setIsReady(!state.isLoading && hasKonvaStage)
    }
    
    // Initial check
    checkReady()
    
    // Subscribe to canvas changes
    const unsubscribe = canvasStore.subscribe((state) => {
      const hasKonvaStage = !!canvasManager.konvaStage
      setIsReady(!state.isLoading && hasKonvaStage)
    })
    
    return unsubscribe
  }, [canvasStore, canvasManager])
  
  return isReady
} 