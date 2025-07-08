import { Circle } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Tool, ToolEvent } from '@/types'
import type { Canvas, TPointerEvent } from 'fabric'
import { Ellipse } from 'fabric'
import { selectionStyle, startMarchingAnts, stopMarchingAnts, type SelectionShape } from './utils/selectionRenderer'
import { useSelectionStore } from '@/store/selectionStore'

let isDrawing = false
let startX = 0
let startY = 0
let currentEllipse: Ellipse | null = null

export const marqueeEllipseTool: Tool = {
  id: TOOL_IDS.MARQUEE_ELLIPSE,
  name: 'Elliptical Marquee Tool',
  icon: Circle,
  cursor: 'crosshair',
  shortcut: 'M',
  isImplemented: true,
  
  onMouseDown: (event: ToolEvent) => {
    const canvas = event.target as Canvas
    const pointer = canvas.getPointer(event.e as TPointerEvent)
    
    isDrawing = true
    startX = pointer.x
    startY = pointer.y
    
    // Create initial ellipse
    currentEllipse = new Ellipse({
      left: startX,
      top: startY,
      originX: 'left',
      originY: 'top',
      rx: 0,
      ry: 0,
      ...selectionStyle
    })
    
    canvas.add(currentEllipse)
    canvas.renderAll()
  },
  
  onMouseMove: (event: ToolEvent) => {
    if (!isDrawing || !currentEllipse) return
    
    const canvas = event.target as Canvas
    const pointer = canvas.getPointer(event.e as TPointerEvent)
    const e = event.e as TPointerEvent
    
    let width = Math.abs(pointer.x - startX)
    let height = Math.abs(pointer.y - startY)
    
    // Check for shift key (constrain to circle)
    if (e.shiftKey) {
      const size = Math.max(width, height)
      width = size
      height = size
    }
    
    // Check for alt/option key (draw from center)
    if (e.altKey) {
      currentEllipse.set({
        left: startX,
        top: startY,
        originX: 'center',
        originY: 'center',
        rx: width / 2,
        ry: height / 2,
      })
    } else {
      currentEllipse.set({
        left: Math.min(startX, pointer.x),
        top: Math.min(startY, pointer.y),
        originX: 'left',
        originY: 'top',
        rx: width / 2,
        ry: height / 2,
      })
    }
    
    canvas.renderAll()
  },
  
  onMouseUp: (event: ToolEvent) => {
    const canvas = event.target as Canvas
    isDrawing = false
    
    if (currentEllipse) {
      // Only keep the selection if it has a minimum size
      const minSize = 2
      if ((currentEllipse.rx ?? 0) < minSize || (currentEllipse.ry ?? 0) < minSize) {
        canvas.remove(currentEllipse)
      } else {
        // Start marching ants animation
        startMarchingAnts(currentEllipse as SelectionShape, canvas)
        
        // Apply selection based on current mode
        const selectionStore = useSelectionStore.getState()
        selectionStore.applySelection(canvas, currentEllipse)
      }
      
      currentEllipse = null
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
      if (obj instanceof Ellipse && !obj.selectable) {
        stopMarchingAnts(obj as SelectionShape)
        canvas.remove(obj)
      }
    })
    
    canvas.defaultCursor = 'default'
    canvas.hoverCursor = 'move'
    canvas.selection = true
    isDrawing = false
    currentEllipse = null
    canvas.renderAll()
  }
} 