import { Brush } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Tool } from '@/types'
import type { Canvas } from 'fabric'
import { PencilBrush } from 'fabric'
import { useToolOptionsStore } from '@/store/toolOptionsStore'

// Store reference to update brush settings
let activeCanvas: Canvas | null = null

export const brushTool: Tool = {
  id: TOOL_IDS.BRUSH,
  name: 'Brush Tool',
  icon: Brush,
  cursor: 'crosshair',
  shortcut: 'B',
  isImplemented: true,
  
  onActivate: (canvas: Canvas) => {
    activeCanvas = canvas
    const toolOptionsStore = useToolOptionsStore.getState()
    
    // Enable drawing mode
    canvas.isDrawingMode = true
    canvas.selection = false
    
    // Create and configure brush
    const brush = new PencilBrush(canvas)
    
    // Get options from store
    const size = toolOptionsStore.getOptionValue<number>(TOOL_IDS.BRUSH, 'size') ?? 10
    const opacity = toolOptionsStore.getOptionValue<number>(TOOL_IDS.BRUSH, 'opacity') ?? 100
    const smoothing = toolOptionsStore.getOptionValue<boolean>(TOOL_IDS.BRUSH, 'smoothing') ?? true
    const color = toolOptionsStore.getOptionValue<string>(TOOL_IDS.BRUSH, 'color') ?? '#000000'
    
    // Apply brush settings
    brush.width = size
    brush.color = hexToRgba(color, opacity / 100)
    brush.decimate = smoothing ? 1 : 0
    
    // Set brush
    canvas.freeDrawingBrush = brush
    
    // Subscribe to option changes
    const unsubscribe = useToolOptionsStore.subscribe(() => {
      if (activeCanvas && activeCanvas.freeDrawingBrush) {
        const store = useToolOptionsStore.getState()
        const newSize = store.getOptionValue<number>(TOOL_IDS.BRUSH, 'size') ?? 10
        const newOpacity = store.getOptionValue<number>(TOOL_IDS.BRUSH, 'opacity') ?? 100
        const newSmoothing = store.getOptionValue<boolean>(TOOL_IDS.BRUSH, 'smoothing') ?? true
        const newColor = store.getOptionValue<string>(TOOL_IDS.BRUSH, 'color') ?? '#000000'
        
        activeCanvas.freeDrawingBrush.width = newSize
        activeCanvas.freeDrawingBrush.color = hexToRgba(newColor, newOpacity / 100)
        ;(activeCanvas.freeDrawingBrush as PencilBrush).decimate = newSmoothing ? 1 : 0
      }
    })
    
    // Store unsubscribe function for cleanup
    ;(canvas as Canvas & { _brushUnsubscribe?: () => void })._brushUnsubscribe = unsubscribe
    
    canvas.renderAll()
  },
  
  onDeactivate: (canvas: Canvas) => {
    activeCanvas = null
    
    // Disable drawing mode
    canvas.isDrawingMode = false
    canvas.selection = true
    
    // Clear brush
    canvas.freeDrawingBrush = undefined
    
    // Unsubscribe from option changes
    const unsubscribe = (canvas as Canvas & { _brushUnsubscribe?: () => void })._brushUnsubscribe
    if (unsubscribe) {
      unsubscribe()
      delete (canvas as Canvas & { _brushUnsubscribe?: () => void })._brushUnsubscribe
    }
    
    canvas.renderAll()
  }
}

// Helper function to convert hex color to rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
} 