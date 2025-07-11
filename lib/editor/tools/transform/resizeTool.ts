import { Maximize2 } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricObject } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import { ModifyCommand } from '@/lib/editor/commands/canvas'

// Define tool state
type ResizeToolState = {
  isResizing: boolean
  // Track original dimensions of each object
  originalDimensions: Map<string, { width: number; height: number; scaleX: number; scaleY: number }>
}

class ResizeTool extends BaseTool {
  // Required properties
  id = TOOL_IDS.RESIZE
  name = 'Resize'
  icon = Maximize2
  cursor = 'default'
  shortcut = 'S'
  
  // Tool state
  private state = createToolState<ResizeToolState>({
    isResizing: false,
    originalDimensions: new Map()
  })
  
  // Required: Setup
  protected setupTool(canvas: Canvas): void {
    // Capture original dimensions of objects when tool is activated
    this.captureOriginalDimensions(canvas)
    
    // Subscribe to tool options
    this.subscribeToToolOptions(() => {
      const mode = this.getOptionValue('mode') as string
      const maintainAspectRatio = this.getOptionValue('maintainAspectRatio') as boolean
      
      if (mode === 'percentage') {
        const percentage = this.getOptionValue('percentage')
        if (typeof percentage === 'number') {
          this.applyResize(canvas, 'percentage', percentage, percentage, maintainAspectRatio)
        }
      } else {
        const width = this.getOptionValue('width')
        const height = this.getOptionValue('height')
        
        if (typeof width === 'number' && typeof height === 'number') {
          this.applyResize(canvas, 'absolute', width, height, maintainAspectRatio)
        }
      }
    })
  }
  
  // Required: Cleanup
  protected cleanup(): void {
    // Clear the stored dimensions
    this.state.get('originalDimensions').clear()
    this.state.set('isResizing', false)
  }
  
  private captureOriginalDimensions(canvas: Canvas): void {
    const objects = canvas.getActiveObjects()
    const targetObjects = objects.length > 0 ? objects : canvas.getObjects()
    
    const dimensionsMap = new Map<string, { width: number; height: number; scaleX: number; scaleY: number }>()
    
    targetObjects.forEach(obj => {
      // Generate a unique key for the object
      const key = obj.get('id') || `${obj.type}_${obj.left}_${obj.top}_${Date.now()}`
      
      // Store the original dimensions
      dimensionsMap.set(key, {
        width: obj.width || 0,
        height: obj.height || 0,
        scaleX: obj.scaleX || 1,
        scaleY: obj.scaleY || 1
      })
      
      // Ensure the object has this key stored
      if (!obj.get('id')) {
        obj.set('id', key)
      }
    })
    
    this.state.set('originalDimensions', dimensionsMap)
    
    // If in absolute mode, update the UI with average dimensions
    if (this.getOptionValue('mode') === 'absolute' && targetObjects.length > 0) {
      let totalWidth = 0
      let totalHeight = 0
      
      targetObjects.forEach(obj => {
        totalWidth += (obj.width || 0) * (obj.scaleX || 1)
        totalHeight += (obj.height || 0) * (obj.scaleY || 1)
      })
      
      const avgWidth = Math.round(totalWidth / targetObjects.length)
      const avgHeight = Math.round(totalHeight / targetObjects.length)
      
      useToolOptionsStore.getState().updateOption(this.id, 'width', avgWidth)
      useToolOptionsStore.getState().updateOption(this.id, 'height', avgHeight)
    }
  }
  
  private applyResize(
    canvas: Canvas, 
    mode: 'percentage' | 'absolute',
    widthValue: number,
    heightValue: number,
    maintainAspectRatio: boolean
  ): void {
    if (this.state.get('isResizing')) return
    
    this.state.set('isResizing', true)
    
    try {
      // Check for active selection first
      const activeObjects = canvas.getActiveObjects()
      const hasSelection = activeObjects.length > 0
      
      // Determine which objects to resize
      const objectsToResize = hasSelection ? activeObjects : canvas.getObjects()
      
      if (objectsToResize.length === 0) return
      
      console.log(`[ResizeTool] Resizing ${objectsToResize.length} object(s) - ${hasSelection ? 'selected only' : 'all objects'}`)
      console.log(`[ResizeTool] Mode: ${mode}, Width: ${widthValue}, Height: ${heightValue}, Maintain AR: ${maintainAspectRatio}`)
      
      const originalDimensions = this.state.get('originalDimensions')
      
      // Apply resize to target objects
      objectsToResize.forEach((obj: FabricObject) => {
        const objId = obj.get('id') as string
        const original = originalDimensions.get(objId)
        
        if (!original) {
          console.warn(`[ResizeTool] No original dimensions found for object ${objId}`)
          return
        }
        
        let newScaleX: number
        let newScaleY: number
        
        if (mode === 'percentage') {
          // For percentage mode, scale relative to original
          newScaleX = original.scaleX * (widthValue / 100)
          newScaleY = original.scaleY * (heightValue / 100)
        } else {
          // For absolute mode, calculate scale to achieve target dimensions
          if (original.width === 0 || original.height === 0) {
            console.warn(`[ResizeTool] Object has zero dimensions, skipping`)
            return
          }
          
          newScaleX = widthValue / original.width
          newScaleY = heightValue / original.height
        }
        
        // Apply aspect ratio constraint if needed
        if (maintainAspectRatio) {
          const scale = Math.min(newScaleX, newScaleY)
          newScaleX = scale
          newScaleY = scale
        }
        
        // Validate the new scale values
        const MIN_SCALE = 0.01
        const MAX_SCALE = 100
        newScaleX = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScaleX))
        newScaleY = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScaleY))
        
        // Get current center point before scaling
        const centerPoint = obj.getCenterPoint()
        
        // Create command for history
        const command = new ModifyCommand(
          canvas,
          obj,
          { 
            scaleX: newScaleX, 
            scaleY: newScaleY
          },
          mode === 'percentage' 
            ? `Resize to ${Math.round(widthValue)}%`
            : `Resize to ${Math.round(widthValue)}×${Math.round(heightValue)}px`
        )
        
        // Execute the command (which will apply the changes)
        this.executeCommand(command)
        
        // Re-center the object at its original center point
        // This prevents objects from moving during resize
        const newCenterPoint = obj.getCenterPoint()
        if (centerPoint.x !== newCenterPoint.x || centerPoint.y !== newCenterPoint.y) {
          obj.set({
            left: (obj.left || 0) + (centerPoint.x - newCenterPoint.x),
            top: (obj.top || 0) + (centerPoint.y - newCenterPoint.y)
          })
          obj.setCoords()
        }
      })
      
      canvas.renderAll()
    } finally {
      this.state.set('isResizing', false)
    }
  }
}

// Export singleton
export const resizeTool = new ResizeTool() 