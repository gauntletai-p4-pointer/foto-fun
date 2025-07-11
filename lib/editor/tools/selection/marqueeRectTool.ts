import { BaseSelectionTool } from '../base/BaseSelectionTool'
import { ToolEvent, SelectionMode } from '@/types'
import { Square } from 'lucide-react'
import Konva from 'konva'

export class MarqueeRectTool extends BaseSelectionTool {
  static toolId = 'marquee-rect'
  static toolName = 'Rectangular Marquee Tool'
  static icon = Square
  static cursor = 'crosshair'
  static shortcut = 'M'
  
  id = MarqueeRectTool.toolId
  name = MarqueeRectTool.toolName
  icon = MarqueeRectTool.icon
  cursor = MarqueeRectTool.cursor
  shortcut = MarqueeRectTool.shortcut
  
  private preview: Konva.Rect | null = null
  private currentBounds: { x: number; y: number; width: number; height: number } | null = null
  private currentMode: SelectionMode = 'replace'
  
  protected setupTool(): void {
    // Tool-specific setup
  }
  
  protected cleanupTool(): void {
    this.cleanup()
  }
  
  onMouseDown(event: ToolEvent): void {
    this.isCreating = true
    this.startPoint = event.point
    this.currentMode = this.getSelectionMode(event)
    
    // Create preview rectangle
    this.preview = new Konva.Rect({
      x: event.point.x,
      y: event.point.y,
      width: 0,
      height: 0,
      stroke: this.getModeColor(this.currentMode),
      strokeWidth: 1,
      dash: [4, 4],
      fill: 'rgba(0, 0, 0, 0.1)',
      listening: false
    })
    
    this.updateVisualFeedback(this.preview)
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isCreating || !this.startPoint || !this.preview) return
    
    // Calculate bounds
    let bounds = {
      x: Math.min(this.startPoint.x, event.point.x),
      y: Math.min(this.startPoint.y, event.point.y),
      width: Math.abs(event.point.x - this.startPoint.x),
      height: Math.abs(event.point.y - this.startPoint.y)
    }
    
    // Apply constraints based on modifiers
    bounds = this.applyConstraints(bounds, event)
    this.currentBounds = bounds
    
    // Update preview
    this.preview.setAttrs(bounds)
    
    // Update mode and color if modifiers changed
    const mode = this.getSelectionMode(event)
    if (mode !== this.currentMode) {
      this.currentMode = mode
      this.preview.stroke(this.getModeColor(mode))
    }
    
    this.overlayLayer.batchDraw()
  }
  
  onMouseUp(event: ToolEvent): void {
    if (!this.isCreating || !this.currentBounds) return
    
    // Get final selection mode
    const mode = this.getSelectionMode(event)
    
    // Create selection mask
    const mask = this.createSelectionMask(this.currentBounds)
    
    // Apply selection
    this.finalizeSelection(mask, mode)
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isCreating) {
      this.cleanup()
    }
  }
  
  protected createSelectionMask(bounds: { x: number; y: number; width: number; height: number }): ImageData {
    if (!this.canvas) {
      throw new Error('Canvas not initialized')
    }
    
    const canvasWidth = this.canvas.state.width
    const canvasHeight = this.canvas.state.height
    const mask = new ImageData(canvasWidth, canvasHeight)
    
    // Ensure bounds are within canvas
    const x1 = Math.max(0, Math.floor(bounds.x))
    const y1 = Math.max(0, Math.floor(bounds.y))
    const x2 = Math.min(canvasWidth, Math.ceil(bounds.x + bounds.width))
    const y2 = Math.min(canvasHeight, Math.ceil(bounds.y + bounds.height))
    
    // Fill rectangle in mask
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const index = (y * canvasWidth + x) * 4 + 3
        mask.data[index] = 255
      }
    }
    
    // Apply anti-aliasing if enabled
    if (this.getOption('antiAlias')) {
      this.applyAntiAliasing(mask, bounds)
    }
    
    return mask
  }
  
  private applyAntiAliasing(mask: ImageData, bounds: { x: number; y: number; width: number; height: number }): void {
    // Apply anti-aliasing to edges
    const { x, y, width, height } = bounds
    
    // Process edges
    for (let py = Math.floor(y); py < Math.ceil(y + height); py++) {
      for (let px = Math.floor(x); px < Math.ceil(x + width); px++) {
        if (px < 0 || px >= mask.width || py < 0 || py >= mask.height) continue
        
        const index = (py * mask.width + px) * 4 + 3
        
        // Calculate distance to edge
        let distance = 1
        
        if (px < x) distance = Math.min(distance, x - px)
        if (px > x + width - 1) distance = Math.min(distance, px - (x + width - 1))
        if (py < y) distance = Math.min(distance, y - py)
        if (py > y + height - 1) distance = Math.min(distance, py - (y + height - 1))
        
        if (distance < 1) {
          mask.data[index] = Math.floor(255 * distance)
        }
      }
    }
  }
}

// Export singleton instance for compatibility
export const marqueeRectTool = new MarqueeRectTool() 