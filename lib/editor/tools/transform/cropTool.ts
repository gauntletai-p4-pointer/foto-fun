import { Crop } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS, ASPECT_RATIOS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point, Rect } from '@/lib/editor/canvas/types'
import { CanvasCroppedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Crop Tool - Allows cropping the canvas content
 * Konva implementation with non-destructive cropping
 */
export class CropTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.CROP
  name = 'Crop Tool'
  icon = Crop
  cursor = 'crosshair'
  shortcut = 'C'
  
  // Crop state
  private isDrawing = false
  private startPoint: Point | null = null
  private cropRect: Konva.Rect | null = null
  private cropOverlay: Konva.Group | null = null
  private overlayLayer: Konva.Layer | null = null
  private disabled = false
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Create overlay layer for crop visualization
    this.overlayLayer = new Konva.Layer()
    canvas.konvaStage.add(this.overlayLayer)
    this.overlayLayer.moveToTop()
    
    // Set default aspect ratio option
    this.setOption('aspectRatio', 'free')
    
    // Reset disabled state
    this.disabled = false
  }
  
  protected cleanupTool(): void {
    // Clean up overlay
    if (this.cropOverlay) {
      this.cropOverlay.destroy()
      this.cropOverlay = null
    }
    
    if (this.cropRect) {
      this.cropRect.destroy()
      this.cropRect = null
    }
    
    if (this.overlayLayer) {
      this.overlayLayer.destroy()
      this.overlayLayer = null
    }
    
    // Reset state
    this.isDrawing = false
    this.startPoint = null
    this.disabled = false
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    if (!this.overlayLayer || this.disabled) return
    
    this.isDrawing = true
    this.startPoint = { x: event.point.x, y: event.point.y }
    
    // Remove existing crop overlay if any
    if (this.cropOverlay) {
      this.cropOverlay.destroy()
    }
    
    // Create crop overlay group
    this.cropOverlay = new Konva.Group()
    this.overlayLayer.add(this.cropOverlay)
    
    // Create semi-transparent overlay for areas outside crop
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    
    // Create dark overlay rectangles
    const topOverlay = new Konva.Rect({
      x: 0,
      y: 0,
      width: stage.width(),
      height: event.point.y,
      fill: 'rgba(0, 0, 0, 0.5)'
    })
    
    const bottomOverlay = new Konva.Rect({
      x: 0,
      y: event.point.y,
      width: stage.width(),
      height: stage.height() - event.point.y,
      fill: 'rgba(0, 0, 0, 0.5)'
    })
    
    const leftOverlay = new Konva.Rect({
      x: 0,
      y: event.point.y,
      width: event.point.x,
      height: 0,
      fill: 'rgba(0, 0, 0, 0.5)'
    })
    
    const rightOverlay = new Konva.Rect({
      x: event.point.x,
      y: event.point.y,
      width: stage.width() - event.point.x,
      height: 0,
      fill: 'rgba(0, 0, 0, 0.5)'
    })
    
    this.cropOverlay.add(topOverlay, bottomOverlay, leftOverlay, rightOverlay)
    
    // Create crop rectangle with dashed border
    this.cropRect = new Konva.Rect({
      x: event.point.x,
      y: event.point.y,
      width: 0,
      height: 0,
      stroke: '#ffffff',
      strokeWidth: 2,
      dash: [5, 5],
      listening: false
    })
    
    this.cropOverlay.add(this.cropRect)
    this.overlayLayer.batchDraw()
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isDrawing || !this.startPoint || !this.cropRect || !this.cropOverlay || this.disabled) return
    
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    
    // Calculate bounds
    const bounds = {
      x: Math.min(this.startPoint.x, event.point.x),
      y: Math.min(this.startPoint.y, event.point.y),
      width: Math.abs(event.point.x - this.startPoint.x),
      height: Math.abs(event.point.y - this.startPoint.y)
    }
    
    // Apply aspect ratio if shift is held
    const aspectRatio = this.getOption('aspectRatio') as string
    if (event.shiftKey && aspectRatio && aspectRatio !== 'free') {
      const ratio = ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS]
      if (ratio) {
        if (bounds.width > bounds.height) {
          bounds.height = bounds.width / ratio
        } else {
          bounds.width = bounds.height * ratio
        }
        
        // Adjust position based on drag direction
        if (event.point.x < this.startPoint.x) {
          bounds.x = this.startPoint.x - bounds.width
        }
        if (event.point.y < this.startPoint.y) {
          bounds.y = this.startPoint.y - bounds.height
        }
      }
    }
    
    // Update crop rectangle
    this.cropRect.setAttrs(bounds)
    
    // Update overlay rectangles
    const overlays = this.cropOverlay.getChildren()
    
    // Top overlay
    overlays[0].setAttrs({
      x: 0,
      y: 0,
      width: stage.width(),
      height: bounds.y
    })
    
    // Bottom overlay
    overlays[1].setAttrs({
      x: 0,
      y: bounds.y + bounds.height,
      width: stage.width(),
      height: stage.height() - (bounds.y + bounds.height)
    })
    
    // Left overlay
    overlays[2].setAttrs({
      x: 0,
      y: bounds.y,
      width: bounds.x,
      height: bounds.height
    })
    
    // Right overlay
    overlays[3].setAttrs({
      x: bounds.x + bounds.width,
      y: bounds.y,
      width: stage.width() - (bounds.x + bounds.width),
      height: bounds.height
    })
    
    this.overlayLayer?.batchDraw()
  }
  
  async onMouseUp(_event: ToolEvent): Promise<void> {
    if (!this.isDrawing) return
    
    this.isDrawing = false
    
    // Add crop handles for fine-tuning
    if (this.cropRect && this.overlayLayer) {
      const bounds = this.cropRect.getAttrs() as Rect
      
      // Only show handles if crop area is large enough
      if (bounds.width > 10 && bounds.height > 10) {
        this.addCropHandles(bounds)
      }
    }
    
    this.startPoint = null
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (!this.cropRect || !this.overlayLayer) return
    
    // Enter key applies the crop
    if (event.key === 'Enter') {
      event.preventDefault()
      this.applyCrop()
    }
    
    // Escape key cancels the crop
    if (event.key === 'Escape') {
      event.preventDefault()
      this.cancelCrop()
    }
  }
  
  /**
   * Add interactive handles to the crop rectangle
   */
  private addCropHandles(bounds: Rect): void {
    if (!this.cropOverlay || !this.overlayLayer) return
    
    const handleSize = 10
    const handles = [
      // Corners
      { x: bounds.x, y: bounds.y, cursor: 'nw-resize' },
      { x: bounds.x + bounds.width, y: bounds.y, cursor: 'ne-resize' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, cursor: 'se-resize' },
      { x: bounds.x, y: bounds.y + bounds.height, cursor: 'sw-resize' },
      // Edges
      { x: bounds.x + bounds.width / 2, y: bounds.y, cursor: 'n-resize' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, cursor: 'e-resize' },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, cursor: 's-resize' },
      { x: bounds.x, y: bounds.y + bounds.height / 2, cursor: 'w-resize' }
    ]
    
    handles.forEach(handle => {
      const handleRect = new Konva.Rect({
        x: handle.x - handleSize / 2,
        y: handle.y - handleSize / 2,
        width: handleSize,
        height: handleSize,
        fill: 'white',
        stroke: 'black',
        strokeWidth: 1,
        draggable: true,
        dragBoundFunc: (pos) => {
          // Implement drag constraints based on handle type
          return pos
        }
      })
      
      handleRect.on('mouseenter', () => {
        const stage = this.getCanvas().konvaStage
        stage.container().style.cursor = handle.cursor
      })
      
      handleRect.on('mouseleave', () => {
        const stage = this.getCanvas().konvaStage
        stage.container().style.cursor = this.cursor
      })
      
      this.cropOverlay!.add(handleRect)
    })
    
    this.overlayLayer.batchDraw()
  }
  
  /**
   * Apply the crop operation
   */
  private async applyCrop(): Promise<void> {
    if (!this.cropRect || this.disabled) return
    
    const canvas = this.getCanvas()
    const bounds = this.cropRect.getAttrs() as Rect
    
    // Validate bounds
    if (bounds.width < 1 || bounds.height < 1) {
      console.warn('[CropTool] Invalid crop bounds')
      return
    }
    
    // Get current canvas bounds for the event
    const previousBounds: Rect = {
      x: 0,
      y: 0,
      width: canvas.state.width,
      height: canvas.state.height
    }
    
    // Apply the crop
    await canvas.crop(bounds)
    
    // Emit event if in ExecutionContext
    if (this.executionContext) {
      await this.executionContext.emit(new CanvasCroppedEvent(
        'canvas',
        previousBounds,
        bounds,
        this.executionContext.getMetadata()
      ))
    }
    
    // Clean up
    this.cancelCrop()
    this.disabled = true
  }
  
  /**
   * Cancel the crop operation
   */
  private cancelCrop(): void {
    if (this.cropOverlay) {
      this.cropOverlay.destroy()
      this.cropOverlay = null
    }
    
    if (this.cropRect) {
      this.cropRect = null
    }
    
    if (this.overlayLayer) {
      this.overlayLayer.batchDraw()
    }
    
    this.disabled = false
  }
  
  protected onOptionChange(key: string, _value: unknown): void {
    // Handle aspect ratio changes during crop
    if (key === 'aspectRatio' && this.cropRect && this.isDrawing) {
      // Could update the crop rectangle to match new aspect ratio
    }
  }
}

// Export singleton instance
export const cropTool = new CropTool() 