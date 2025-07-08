import { Lasso } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Tool, ToolEvent } from '@/types'
import type { Canvas, TPointerEvent } from 'fabric'
import { Polygon } from 'fabric'
import { selectionStyle, startMarchingAnts, stopMarchingAnts, type SelectionShape } from './utils/selectionRenderer'
import { useSelectionStore } from '@/store/selectionStore'

let isDrawing = false
let points: Array<{ x: number; y: number }> = []
let currentPath: Polygon | null = null
let previewPath: Polygon | null = null

export const lassoTool: Tool = {
  id: TOOL_IDS.LASSO,
  name: 'Lasso Tool',
  icon: Lasso,
  cursor: 'crosshair',
  shortcut: 'L',
  isImplemented: true,
  
  onMouseDown: (event: ToolEvent) => {
    const canvas = event.target as Canvas
    const pointer = canvas.getPointer(event.e as TPointerEvent)
    
    if (!isDrawing) {
      // Start new lasso selection
      isDrawing = true
      points = [{ x: pointer.x, y: pointer.y }]
      
      // Create preview path
      previewPath = new Polygon(points, {
        ...selectionStyle,
        fill: 'transparent',
        strokeDashArray: [3, 3],
      })
      
      canvas.add(previewPath)
      canvas.renderAll()
    }
  },
  
  onMouseMove: (event: ToolEvent) => {
    if (!isDrawing || !previewPath) return
    
    const canvas = event.target as Canvas
    const pointer = canvas.getPointer(event.e as TPointerEvent)
    
    // Add point to path
    points.push({ x: pointer.x, y: pointer.y })
    
    // Update preview path
    canvas.remove(previewPath)
    previewPath = new Polygon(points, {
      ...selectionStyle,
      fill: 'transparent',
      strokeDashArray: [3, 3],
    })
    canvas.add(previewPath)
    
    canvas.renderAll()
  },
  
  onMouseUp: (event: ToolEvent) => {
    if (!isDrawing || !previewPath) return
    
    const canvas = event.target as Canvas
    isDrawing = false
    
    // Remove preview path
    canvas.remove(previewPath)
    
    // Check if we have enough points for a valid selection
    if (points.length < 3) {
      points = []
      previewPath = null
      canvas.renderAll()
      return
    }
    
    // Close the path by connecting to the first point
    const firstPoint = points[0]
    const lastPoint = points[points.length - 1]
    const distance = Math.sqrt(
      Math.pow(lastPoint.x - firstPoint.x, 2) + 
      Math.pow(lastPoint.y - firstPoint.y, 2)
    )
    
    // Auto-close if last point is far from first
    if (distance > 10) {
      points.push({ x: firstPoint.x, y: firstPoint.y })
    }
    
    // Create final selection polygon
    currentPath = new Polygon(points, {
      ...selectionStyle,
    })
    
    canvas.add(currentPath)
    
    // Start marching ants animation
    startMarchingAnts(currentPath as SelectionShape, canvas)
    
    // Apply selection based on current mode
    const selectionStore = useSelectionStore.getState()
    selectionStore.applySelection(canvas, currentPath)
    
    // Reset
    points = []
    previewPath = null
    currentPath = null
    
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
      if (obj instanceof Polygon && !obj.selectable) {
        stopMarchingAnts(obj as SelectionShape)
        canvas.remove(obj)
      }
    })
    
    // Clean up if still drawing
    if (previewPath) {
      canvas.remove(previewPath)
    }
    
    canvas.defaultCursor = 'default'
    canvas.hoverCursor = 'move'
    canvas.selection = true
    isDrawing = false
    points = []
    previewPath = null
    currentPath = null
    canvas.renderAll()
  }
} 