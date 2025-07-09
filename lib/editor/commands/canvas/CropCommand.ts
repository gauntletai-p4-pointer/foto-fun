import { Command } from '../base'
import type { Canvas, FabricObject } from 'fabric'
import { Rect } from 'fabric'

interface CropBounds {
  left: number
  top: number
  width: number
  height: number
}

interface ObjectState {
  clipPath?: unknown // Using unknown to avoid complex Fabric type issues
  left: number
  top: number
  scaleX: number
  scaleY: number
}

/**
 * Command to crop the canvas content
 * Stores original states to enable undo/redo
 */
export class CropCommand extends Command {
  private canvas: Canvas
  private cropBounds: CropBounds
  private originalStates: Map<FabricObject, ObjectState> = new Map()
  private originalCanvasSize: { width: number; height: number }
  private newCanvasSize?: { width: number; height: number }
  private scale: number = 1
  
  constructor(canvas: Canvas, cropBounds: CropBounds) {
    super('Crop image')
    this.canvas = canvas
    this.cropBounds = cropBounds
    
    // Store original canvas size
    this.originalCanvasSize = {
      width: canvas.getWidth(),
      height: canvas.getHeight()
    }
    
    // Store original state of all objects
    const objects = canvas.getObjects()
    objects.forEach(obj => {
      this.originalStates.set(obj, {
        clipPath: obj.clipPath,
        left: obj.left || 0,
        top: obj.top || 0,
        scaleX: obj.scaleX || 1,
        scaleY: obj.scaleY || 1
      })
    })
  }
  
  async execute(): Promise<void> {
    const { left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight } = this.cropBounds
    
    // Calculate scale factor to fit canvas
    const canvasWidth = this.canvas.getWidth()
    const canvasHeight = this.canvas.getHeight()
    const scaleX = canvasWidth / cropWidth
    const scaleY = canvasHeight / cropHeight
    this.scale = Math.min(scaleX, scaleY)
    
    // Apply crop to all objects
    this.originalStates.forEach((originalState, obj) => {
      // Create and apply clip rectangle
      const clipRect = new Rect({
        left: cropLeft,
        top: cropTop,
        width: cropWidth,
        height: cropHeight,
        absolutePositioned: true
      })
      
      obj.clipPath = clipRect
      
      // Scale the object
      obj.set({
        scaleX: originalState.scaleX * this.scale,
        scaleY: originalState.scaleY * this.scale
      })
      
      // Reposition the object
      obj.set({
        left: (originalState.left - cropLeft) * this.scale,
        top: (originalState.top - cropTop) * this.scale
      })
      
      obj.setCoords()
    })
    
    // Optionally resize canvas to maintain aspect ratio
    if (scaleX !== scaleY) {
      this.newCanvasSize = {
        width: cropWidth * this.scale,
        height: cropHeight * this.scale
      }
      this.canvas.setDimensions(this.newCanvasSize)
    }
    
    this.canvas.renderAll()
  }
  
  async undo(): Promise<void> {
    // Restore original states for all objects
    this.originalStates.forEach((originalState, obj) => {
      obj.set({
        clipPath: originalState.clipPath,
        left: originalState.left,
        top: originalState.top,
        scaleX: originalState.scaleX,
        scaleY: originalState.scaleY
      })
      obj.setCoords()
    })
    
    // Restore original canvas size
    this.canvas.setDimensions(this.originalCanvasSize)
    
    this.canvas.renderAll()
  }
  
  async redo(): Promise<void> {
    // Re-execute the crop
    await this.execute()
  }
  
  canExecute(): boolean {
    // Can execute if there are objects to crop
    return this.canvas.getObjects().length > 0
  }
} 