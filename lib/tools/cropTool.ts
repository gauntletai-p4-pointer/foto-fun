import { Crop } from 'lucide-react'
import { TOOL_IDS, ASPECT_RATIOS } from '@/constants'
import type { Tool, ToolEvent } from '@/types'
import type { Canvas, TPointerEvent, FabricObject } from 'fabric'
import { Rect } from 'fabric'
import { useToolOptionsStore } from '@/store/toolOptionsStore'

let cropRect: Rect | null = null
let isDrawing = false
let mouseDown: MouseEvent | null = null
let disabled = false

export const cropTool: Tool = {
  id: TOOL_IDS.CROP,
  name: 'Crop Tool',
  icon: Crop,
  cursor: 'crosshair',
  shortcut: 'C',
  isImplemented: true,
  
  onMouseDown: (event: ToolEvent) => {
    if (disabled) return
    
    const canvas = event.target as Canvas
    const e = event.e as TPointerEvent
    
    if (!cropRect) {
      // Create crop rectangle if it doesn't exist
      cropRect = new Rect({
        fill: 'rgba(0,0,0,0.3)',
        stroke: '#ffffff',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        visible: false,
        hasRotatingPoint: false,
        transparentCorners: false,
        cornerColor: 'white',
        cornerStrokeColor: 'black',
        borderColor: 'white',
        borderDashArray: [5, 5],
        lockRotation: true
      })
      canvas.add(cropRect)
    }
    
    const pointer = canvas.getPointer(e)
    
    cropRect.set({
      width: 2,
      height: 2,
      left: pointer.x,
      top: pointer.y,
      visible: true
    })
    
    mouseDown = e as MouseEvent
    isDrawing = true
    canvas.setActiveObject(cropRect)
    canvas.renderAll()
  },
  
  onMouseMove: (event: ToolEvent) => {
    if (!mouseDown || !isDrawing || !cropRect || disabled) return
    
    const canvas = event.target as Canvas
    const e = event.e as TPointerEvent
    const pointer = canvas.getPointer(e)
    
    if (!mouseDown) return
    
    let width = pointer.x - cropRect.left!
    let height = pointer.y - cropRect.top!
    
    // Handle negative dimensions (dragging left/up)
    let left = cropRect.left!
    let top = cropRect.top!
    
    if (width < 0) {
      left = pointer.x
      width = Math.abs(width)
    }
    
    if (height < 0) {
      top = pointer.y
      height = Math.abs(height)
    }
    
    // Handle aspect ratio if shift is held
    const aspectRatio = useToolOptionsStore.getState().getOptionValue<string>(TOOL_IDS.CROP, 'aspectRatio')
    const ratio = aspectRatio && aspectRatio !== 'free' ? ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS] : null
    
    if (ratio && e.shiftKey) {
      if (width > height) {
        height = width / ratio
      } else {
        width = height * ratio
      }
    }
    
    cropRect.set({
      left: left,
      top: top,
      width: width,
      height: height
    })
    
    canvas.renderAll()
  },
  
  onMouseUp: () => {
    mouseDown = null
    isDrawing = false
  },
  
  onActivate: (canvas: Canvas) => {
    canvas.defaultCursor = 'crosshair'
    disabled = false
    
    // Add keyboard event listener for Enter/Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter key applies the crop
      if (e.key === 'Enter' && cropRect && cropRect.visible) {
        // Get all objects on canvas except the crop rect
        const objects = canvas.getObjects().filter(obj => obj !== cropRect)
        
        if (objects.length === 0) return
        
        // Get crop rect bounds
        const cropLeft = cropRect.left!
        const cropTop = cropRect.top!
        const cropWidth = cropRect.width! * cropRect.scaleX!
        const cropHeight = cropRect.height! * cropRect.scaleY!
        
        // Remove crop rect
        canvas.remove(cropRect)
        
        // Apply clipPath to each object
        objects.forEach((obj: FabricObject) => {
          // Create a clip rectangle
          const clipRect = new Rect({
            left: cropLeft,
            top: cropTop,
            width: cropWidth,
            height: cropHeight,
            absolutePositioned: true
          })
          
          obj.clipPath = clipRect
        })
        
        // Calculate scale factor to fit canvas
        const scaleX = canvas.width! / cropWidth
        const scaleY = canvas.height! / cropHeight
        const scale = Math.min(scaleX, scaleY)
        
        // Apply transformation to fit the cropped area to canvas
        objects.forEach((obj: FabricObject) => {
          // Scale the object
          obj.scale(obj.scaleX! * scale)
          
          // Reposition the object
          obj.set({
            left: ((obj.left || 0) - cropLeft) * scale,
            top: ((obj.top || 0) - cropTop) * scale
          })
          
          obj.setCoords()
        })
        
        // Optionally resize canvas to maintain aspect ratio
        if (scaleX !== scaleY) {
          canvas.setDimensions({
            width: cropWidth * scale,
            height: cropHeight * scale
          })
        }
        
        canvas.renderAll()
        disabled = true
      }
      
      // Escape key cancels the crop
      if (e.key === 'Escape') {
        if (cropRect) {
          canvas.remove(cropRect)
          cropRect = null
          canvas.renderAll()
        }
        disabled = false
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    // Store handler for cleanup
    ;(canvas as Canvas & { _cropKeyHandler?: (e: KeyboardEvent) => void })._cropKeyHandler = handleKeyDown
  },
  
  onDeactivate: (canvas: Canvas) => {
    // Clean up
    if (cropRect) {
      canvas.remove(cropRect)
      cropRect = null
    }
    
    // Remove keyboard listener
    const handler = (canvas as Canvas & { _cropKeyHandler?: (e: KeyboardEvent) => void })._cropKeyHandler
    if (handler) {
      window.removeEventListener('keydown', handler)
      delete (canvas as Canvas & { _cropKeyHandler?: (e: KeyboardEvent) => void })._cropKeyHandler
    }
    
    canvas.defaultCursor = 'default'
    isDrawing = false
    mouseDown = null
    disabled = false
    canvas.renderAll()
  }
} 