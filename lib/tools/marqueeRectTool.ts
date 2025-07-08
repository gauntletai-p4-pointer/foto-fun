import { Square } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Tool, ToolEvent } from '@/types'
import type { Canvas, FabricObject } from 'fabric'
import { Rect } from 'fabric'

let isDrawing = false
let startX = 0
let startY = 0
let selectionRect: Rect | null = null

export const marqueeRectTool: Tool = {
  id: TOOL_IDS.MARQUEE_RECT,
  name: 'Rectangular Marquee Tool',
  icon: Square,
  cursor: 'crosshair',
  shortcut: 'M',
  isImplemented: true,
  
  onActivate: (canvas: Canvas) => {
    // Disable object selection
    canvas.selection = false
    canvas.defaultCursor = 'crosshair'
    canvas.hoverCursor = 'crosshair'
    
    // Make all objects non-selectable during marquee
    canvas.forEachObject((obj) => {
      obj.selectable = false
      obj.evented = false
    })
    
    canvas.renderAll()
  },
  
  onDeactivate: (canvas: Canvas) => {
    // Clean up any active selection rectangle
    if (selectionRect) {
      canvas.remove(selectionRect)
      selectionRect = null
    }
    
    isDrawing = false
    canvas.renderAll()
  },
  
  onMouseDown: (e: ToolEvent) => {
    const canvas = e.target
    if (!canvas) return
    
    isDrawing = true
    const pointer = canvas.getPointer(e.e)
    startX = pointer.x
    startY = pointer.y
    
    // Remove previous selection rectangle if exists
    if (selectionRect) {
      canvas.remove(selectionRect)
    }
    
    // Create new selection rectangle
    selectionRect = new Rect({
      left: startX,
      top: startY,
      width: 0,
      height: 0,
      fill: 'rgba(0, 120, 215, 0.1)',
      stroke: 'rgba(0, 120, 215, 0.8)',
      strokeWidth: 1,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      excludeFromExport: true
    })
    
    canvas.add(selectionRect)
    canvas.renderAll()
  },
  
  onMouseMove: (e: ToolEvent) => {
    if (!isDrawing || !selectionRect) return
    
    const canvas = e.target
    const pointer = canvas.getPointer(e.e)
    
    const width = pointer.x - startX
    const height = pointer.y - startY
    
    selectionRect.set({
      left: width < 0 ? pointer.x : startX,
      top: height < 0 ? pointer.y : startY,
      width: Math.abs(width),
      height: Math.abs(height)
    })
    
    canvas.renderAll()
  },
  
  onMouseUp: (e: ToolEvent) => {
    if (!isDrawing || !selectionRect) return
    
    isDrawing = false
    const canvas = e.target
    
    // Get the bounds of the selection rectangle
    const selectionBounds = selectionRect.getBoundingRect()
    
    // Find objects within the selection
    const selectedObjects: FabricObject[] = []
    canvas.forEachObject((obj: FabricObject) => {
      if (obj === selectionRect) return
      
      const objBounds = obj.getBoundingRect()
      
      // Check if object is within selection bounds
      if (objBounds.left >= selectionBounds.left &&
          objBounds.top >= selectionBounds.top &&
          objBounds.left + objBounds.width <= selectionBounds.left + selectionBounds.width &&
          objBounds.top + objBounds.height <= selectionBounds.top + selectionBounds.height) {
        selectedObjects.push(obj)
      }
    })
    
    // Remove the selection rectangle
    canvas.remove(selectionRect)
    selectionRect = null
    
    // If objects were selected, switch to move tool and select them
    if (selectedObjects.length > 0) {
      // Import and use tool store
      const toolStore = useToolStore.getState()
      toolStore.setActiveTool(TOOL_IDS.MOVE)
      
      // Select the objects
      if (selectedObjects.length === 1) {
        canvas.setActiveObject(selectedObjects[0])
      } else {
        const selection = new ActiveSelection(selectedObjects, { canvas })
        canvas.setActiveObject(selection)
      }
    }
    
    canvas.renderAll()
  }
}

// Import at the end to avoid circular dependencies
import { useToolStore } from '@/store/toolStore'
import { ActiveSelection } from 'fabric' 