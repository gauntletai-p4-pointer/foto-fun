import { Hand } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Tool, ToolEvent } from '@/types'
import type { Canvas, TPointerEventInfo } from 'fabric'
import { useCanvasStore } from '@/store/canvasStore'

export const handTool: Tool = {
  id: TOOL_IDS.HAND,
  name: 'Hand Tool',
  icon: Hand,
  cursor: 'grab',
  shortcut: 'H',
  isImplemented: true,
  
  onActivate: (canvas: Canvas) => {
    // Disable object selection
    canvas.selection = false
    canvas.defaultCursor = 'grab'
    canvas.hoverCursor = 'grab'
    
    // Make all objects non-selectable
    canvas.forEachObject((obj) => {
      obj.selectable = false
      obj.evented = false
    })
    
    canvas.renderAll()
  },
  
  onDeactivate: (canvas: Canvas) => {
    canvas.defaultCursor = 'default'
    canvas.hoverCursor = 'move'
  },
  
  onMouseDown: (e: ToolEvent) => {
    try {
      const canvasStore = useCanvasStore.getState()
      const canvas = e.target
      
      if (!canvas) {
        console.warn('Hand tool: Canvas not available')
        return
      }
      
      canvas.setCursor('grabbing')
      
      // Check if it's a mouse event (not touch)
      if (e.e instanceof MouseEvent) {
        canvasStore.startPanning(e as TPointerEventInfo<MouseEvent>)
      }
    } catch (error) {
      console.error('Hand tool onMouseDown error:', error)
    }
  },
  
  onMouseMove: (e: ToolEvent) => {
    try {
      const canvasStore = useCanvasStore.getState()
      
      // Check if it's a mouse event (not touch)
      if (e.e instanceof MouseEvent && canvasStore.isPanning) {
        canvasStore.pan(e as TPointerEventInfo<MouseEvent>)
      }
    } catch (error) {
      console.error('Hand tool onMouseMove error:', error)
    }
  },
  
  onMouseUp: (e: ToolEvent) => {
    try {
      const canvasStore = useCanvasStore.getState()
      const canvas = e.target
      
      if (canvas && typeof canvas.setCursor === 'function') {
        canvas.setCursor('grab')
      }
      
      canvasStore.endPanning()
    } catch (error) {
      console.error('Hand tool onMouseUp error:', error)
    }
  }
} 