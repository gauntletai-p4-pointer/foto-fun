import { Square } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Tool, ToolEvent } from '@/types'
import type { Canvas, TPointerEvent } from 'fabric'
import { Rect } from 'fabric'
import { selectionStyle, startMarchingAnts, stopMarchingAnts, type SelectionShape } from './utils/selectionRenderer'
import { useSelectionStore } from '@/store/selectionStore'

let isDrawing = false
let startX = 0
let startY = 0
let currentRect: Rect | null = null

export const marqueeRectTool: Tool = {
  id: TOOL_IDS.MARQUEE_RECT,
  name: 'Rectangular Marquee Tool',
  icon: Square,
  cursor: 'crosshair',
  shortcut: 'M',
  isImplemented: true,
  
  onMouseDown: (event: ToolEvent) => {
    const canvas = event.target as Canvas
    const pointer = canvas.getPointer(event.e as TPointerEvent)
    
    isDrawing = true
    startX = pointer.x
    startY = pointer.y
    
    // Create initial rectangle
    currentRect = new Rect({
      left: startX,
      top: startY,
      width: 0,
      height: 0,
      ...selectionStyle
    })
    
    canvas.add(currentRect)
    canvas.renderAll()
  },
  
  onMouseMove: (event: ToolEvent) => {
    if (!isDrawing || !currentRect) return
    
    const canvas = event.target as Canvas
    const pointer = canvas.getPointer(event.e as TPointerEvent)
    const e = event.e as TPointerEvent
    
    let width = pointer.x - startX
    let height = pointer.y - startY
    
    // Check for shift key (constrain to square)
    if (e.shiftKey) {
      const size = Math.max(Math.abs(width), Math.abs(height))
      width = width < 0 ? -size : size
      height = height < 0 ? -size : size
    }
    
    // Check for alt/option key (draw from center)
    if (e.altKey) {
      currentRect.set({
        left: startX - Math.abs(width),
        top: startY - Math.abs(height),
        width: Math.abs(width) * 2,
        height: Math.abs(height) * 2,
      })
    } else {
      currentRect.set({
        left: width < 0 ? pointer.x : startX,
        top: height < 0 ? pointer.y : startY,
        width: Math.abs(width),
        height: Math.abs(height),
      })
    }
    
    canvas.renderAll()
  },
  
  onMouseUp: (event: ToolEvent) => {
    const canvas = event.target as Canvas
    isDrawing = false
    
    if (currentRect) {
      // Only keep the selection if it has a minimum size
      const minSize = 2
      if ((currentRect.width ?? 0) < minSize || (currentRect.height ?? 0) < minSize) {
        canvas.remove(currentRect)
      } else {
        // Start marching ants animation
        startMarchingAnts(currentRect as SelectionShape, canvas)
        
        // Apply selection based on current mode
        const selectionStore = useSelectionStore.getState()
        selectionStore.applySelection(canvas, currentRect)
      }
      
      currentRect = null
    }
    
    canvas.renderAll()
  },
  
  onActivate: (canvas: Canvas) => {
    canvas.defaultCursor = 'crosshair'
    canvas.hoverCursor = 'crosshair'
    canvas.selection = false
  },
  
  onDeactivate: (canvas: Canvas) => {
    // Clean up any existing selections
    const objects = canvas.getObjects()
    objects.forEach(obj => {
      if (obj instanceof Rect && !obj.selectable) {
        stopMarchingAnts(obj as SelectionShape)
        canvas.remove(obj)
      }
    })
    
    canvas.defaultCursor = 'default'
    canvas.hoverCursor = 'move'
    canvas.selection = true
    isDrawing = false
    currentRect = null
    canvas.renderAll()
  }
} 