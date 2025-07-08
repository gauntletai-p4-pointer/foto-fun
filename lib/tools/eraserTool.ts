import { Eraser } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Tool } from '@/types'
import type { Canvas } from 'fabric'
import { PencilBrush } from 'fabric'
import { useToolOptionsStore } from '@/store/toolOptionsStore'

// Store reference to update eraser settings
let activeCanvas: Canvas | null = null

export const eraserTool: Tool = {
  id: TOOL_IDS.ERASER,
  name: 'Eraser Tool',
  icon: Eraser,
  cursor: 'crosshair',
  shortcut: 'E',
  isImplemented: true,
  
  onActivate: (canvas: Canvas) => {
    activeCanvas = canvas
    const toolOptionsStore = useToolOptionsStore.getState()
    
    // Enable drawing mode
    canvas.isDrawingMode = true
    canvas.selection = false
    
    // Create and configure eraser brush
    const brush = new PencilBrush(canvas)
    
    // Get options from store
    const size = toolOptionsStore.getOptionValue<number>(TOOL_IDS.ERASER, 'size') ?? 20
    
    // Apply eraser settings
    brush.width = size
    brush.color = '#FFFFFF' // White color for erasing
    
    // Set brush with destination-out composite operation for erasing
    canvas.freeDrawingBrush = brush
    
    // Apply composite operation to make it erase
    canvas.on('path:created', (e) => {
      const path = e.path
      if (path) {
        path.globalCompositeOperation = 'destination-out'
        canvas.renderAll()
      }
    })
    
    // Subscribe to option changes
    const unsubscribe = useToolOptionsStore.subscribe(() => {
      if (activeCanvas && activeCanvas.freeDrawingBrush) {
        const store = useToolOptionsStore.getState()
        const newSize = store.getOptionValue<number>(TOOL_IDS.ERASER, 'size') ?? 20
        
        activeCanvas.freeDrawingBrush.width = newSize
      }
    })
    
    // Store unsubscribe function for cleanup
    ;(canvas as Canvas & { _eraserUnsubscribe?: () => void })._eraserUnsubscribe = unsubscribe
    
    canvas.renderAll()
  },
  
  onDeactivate: (canvas: Canvas) => {
    activeCanvas = null
    
    // Disable drawing mode
    canvas.isDrawingMode = false
    canvas.selection = true
    
    // Clear brush
    canvas.freeDrawingBrush = undefined
    
    // Remove path:created listener
    canvas.off('path:created')
    
    // Unsubscribe from option changes
    const unsubscribe = (canvas as Canvas & { _eraserUnsubscribe?: () => void })._eraserUnsubscribe
    if (unsubscribe) {
      unsubscribe()
      delete (canvas as Canvas & { _eraserUnsubscribe?: () => void })._eraserUnsubscribe
    }
    
    canvas.renderAll()
  }
} 