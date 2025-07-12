import { ObjectTool } from './ObjectTool'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import type { ToolDependencies } from './BaseTool'

/**
 * Base class for object-based drawing tools
 * Handles creating new image objects or drawing on existing ones
 */
export abstract class ObjectDrawingTool extends ObjectTool {
  constructor(dependencies: ToolDependencies) {
    super(dependencies)
  }
  protected currentDrawingObject: string | null = null
  protected isDrawing = false
  
  /**
   * Start drawing - either on existing object or create new one
   */
  protected async startDrawing(x: number, y: number): Promise<void> {
    // If no object selected, create new one
    const target = this.getTargetObject()
    if (!target || target.type !== 'image') {
      this.currentDrawingObject = await this.createNewObject('image', {
        x,
        y,
        width: this.getDefaultCanvasSize(),
        height: this.getDefaultCanvasSize(),
        data: {
          element: this.createEmptyCanvas(),
          naturalWidth: this.getDefaultCanvasSize(),
          naturalHeight: this.getDefaultCanvasSize()
        }
      })
    } else {
      this.currentDrawingObject = target.id
    }
    
    this.isDrawing = true
  }
  
  /**
   * Stop drawing
   */
  protected stopDrawing(): void {
    this.isDrawing = false
    this.currentDrawingObject = null
  }
  
  /**
   * Get the current drawing object
   */
  protected getDrawingObject(): CanvasObject | null {
    if (!this.currentDrawingObject) return null
    return this.dependencies.canvasManager.getObject(this.currentDrawingObject)
  }
  
  /**
   * Create an empty canvas element for drawing
   */
  protected createEmptyCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = this.getDefaultCanvasSize()
    canvas.height = this.getDefaultCanvasSize()
    
    // Initialize with transparent pixels
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    return canvas
  }
  
  /**
   * Get default canvas size for new drawing objects
   */
  protected getDefaultCanvasSize(): number {
    return 512 // Default 512x512 for new paint objects
  }
  
  /**
   * Draw on the object's canvas
   */
  protected drawOnObject(object: CanvasObject, draw: (ctx: CanvasRenderingContext2D) => void): void {
    if (object.type !== 'image') return
    
    const imageData = object.data as { element: HTMLCanvasElement }
    if (!imageData.element || !(imageData.element instanceof HTMLCanvasElement)) {
      console.warn('Object does not have a canvas element')
      return
    }
    
    const ctx = imageData.element.getContext('2d')
    if (!ctx) return
    
    // Save context state
    ctx.save()
    
    // Apply drawing operation
    draw(ctx)
    
    // Restore context state
    ctx.restore()
    
    // Trigger canvas update
    this.dependencies.canvasManager.render()
  }
  
  // Common event handlers - these will be called by BaseTool's event handling
  protected handleMouseDown(event: ToolEvent): void {
    // Update last mouse position
    this.lastMousePosition = event.point
    
    // Start drawing at mouse position
    this.startDrawing(event.point.x, event.point.y)
  }
  
  protected handleMouseUp(_event: ToolEvent): void {
    this.stopDrawing()
  }
  
  protected handleMouseMove(event: ToolEvent): void {
    // Update last mouse position
    this.lastMousePosition = event.point
  }
} 