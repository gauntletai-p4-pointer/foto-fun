import { ZoomIn } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Tool, ToolEvent } from '@/types'
import type { Canvas } from 'fabric'
import { Point } from 'fabric'
import { useCanvasStore } from '@/store/canvasStore'
import { useToolOptionsStore } from '@/store/toolOptionsStore'

interface ZoomHandlers {
  handleKeyDown: (e: KeyboardEvent) => void
  handleKeyUp: (e: KeyboardEvent) => void
}

export const zoomTool: Tool = {
  id: TOOL_IDS.ZOOM,
  name: 'Zoom Tool',
  icon: ZoomIn,
  cursor: 'zoom-in',
  shortcut: 'Z',
  isImplemented: true,
  
  onActivate: (canvas: Canvas) => {
    canvas.selection = false
    canvas.defaultCursor = 'zoom-in'
    canvas.hoverCursor = 'zoom-in'
    
    // Make all objects non-selectable
    canvas.forEachObject((obj) => {
      obj.selectable = false
      obj.evented = false
    })
    
    // Add keyboard listener for Alt key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        canvas.defaultCursor = 'zoom-out'
        canvas.hoverCursor = 'zoom-out'
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) {
        canvas.defaultCursor = 'zoom-in'
        canvas.hoverCursor = 'zoom-in'
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    // Store handlers for cleanup
    ;(canvas as Canvas & { _zoomKeyHandlers?: ZoomHandlers })._zoomKeyHandlers = { handleKeyDown, handleKeyUp }
    
    canvas.renderAll()
  },
  
  onDeactivate: (canvas: Canvas) => {
    // Remove keyboard listeners
    const handlers = (canvas as Canvas & { _zoomKeyHandlers?: ZoomHandlers })._zoomKeyHandlers
    if (handlers) {
      window.removeEventListener('keydown', handlers.handleKeyDown)
      window.removeEventListener('keyup', handlers.handleKeyUp)
      delete (canvas as Canvas & { _zoomKeyHandlers?: ZoomHandlers })._zoomKeyHandlers
    }
    
    canvas.defaultCursor = 'default'
    canvas.hoverCursor = 'move'
    canvas.renderAll()
  },
  
  onMouseDown: (e: ToolEvent) => {
    const canvas = e.target
    if (!canvas) return
    
    const canvasStore = useCanvasStore.getState()
    const toolOptionsStore = useToolOptionsStore.getState()
    const pointer = canvas.getPointer(e.e)
    const point = new Point(pointer.x, pointer.y)
    
    // Get zoom step from options
    const zoomStepPercent = toolOptionsStore.getOptionValue<number>(TOOL_IDS.ZOOM, 'zoomStep') ?? 25
    const zoomStep = zoomStepPercent / 100
    
    // Check if Alt is pressed for zoom out
    const isZoomOut = (e.e as MouseEvent).altKey
    
    // Calculate new zoom level
    const currentZoom = canvas.getZoom()
    const zoomFactor = isZoomOut ? (1 - zoomStep) : (1 + zoomStep)
    const newZoom = currentZoom * zoomFactor
    
    // Apply zoom limits
    const minZoom = 0.01 // 1%
    const maxZoom = 32   // 3200%
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom))
    
    // Zoom to the clicked point
    canvas.zoomToPoint(point, clampedZoom)
    
    // Update the store
    canvasStore.setZoom(clampedZoom)
    
    canvas.renderAll()
  }
} 