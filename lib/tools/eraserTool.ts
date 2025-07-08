import { Eraser } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, TSimplePathData } from 'fabric'
import { PencilBrush } from 'fabric'
import { DrawingTool } from './base/DrawingTool'
import type { ToolOption } from '@/store/toolOptionsStore'

/**
 * Custom Eraser Brush that uses destination-out composite operation
 */
class EraserBrush extends PencilBrush {
  /**
   * Override to set globalCompositeOperation on the path
   */
  createPath(pathData: TSimplePathData) {
    const path = super.createPath(pathData)
    // Set the composite operation for erasing
    // These properties exist at runtime but aren't in the types
    Object.assign(path, {
      globalCompositeOperation: 'destination-out',
      absolutePositioned: true
    })
    return path
  }
}

/**
 * Eraser Tool - Removes content by drawing
 * Extends DrawingTool for consistent drawing behavior
 */
class EraserTool extends DrawingTool {
  // Tool identification
  id = TOOL_IDS.ERASER
  name = 'Eraser Tool'
  icon = Eraser
  cursor = 'crosshair'
  shortcut = 'E'
  
  // Tool properties
  protected strokeColor = 'rgba(0,0,0,1)' // Black with full opacity for destination-out
  protected strokeWidth = 20
  protected opacity = 100
  
  // Eraser-specific properties
  private brush: EraserBrush | null = null
  
  /**
   * Tool setup - enable erasing mode
   */
  protected setupTool(canvas: Canvas): void {
    // Enable Fabric.js drawing mode
    canvas.isDrawingMode = true
    canvas.selection = false
    
    // Create and configure eraser brush
    this.brush = new EraserBrush(canvas)
    this.updateBrushSettings()
    canvas.freeDrawingBrush = this.brush
    
    // Subscribe to option changes
    this.subscribeToToolOptions((options) => {
      this.updateToolProperties(options)
      this.updateBrushSettings()
    })
    
    // Listen for path creation to record commands
    this.addCanvasEvent('path:created', (e: unknown) => {
      const event = e as { path: fabric.Path }
      this.handlePathCreated(event.path)
    })
    
    canvas.renderAll()
  }
  
  /**
   * Tool cleanup - disable drawing mode
   */
  protected cleanup(canvas: Canvas): void {
    // Disable drawing mode
    canvas.isDrawingMode = false
    canvas.selection = true
    
    // Clear brush
    canvas.freeDrawingBrush = undefined
    this.brush = null
    
    canvas.renderAll()
  }
  
  /**
   * Update brush settings
   */
  private updateBrushSettings(): void {
    if (!this.brush || !this.canvas) return
    
    this.brush.width = this.strokeWidth
    // Use black color for destination-out composite operation
    this.brush.color = 'rgba(0,0,0,1)'
  }
  
  /**
   * Handle path creation - record command
   */
  private handlePathCreated(path: fabric.Path): void {
    if (!this.canvas) return
    
    this.track('eraserPathCreated', () => {
      // The path already has globalCompositeOperation set by EraserBrush
      
      // TODO: Create and execute an EraseCommand when command system is implemented
      console.log('Eraser stroke created:', {
        pathData: path.path,
        width: this.strokeWidth
      })
      
      this.canvas!.renderAll()
    })
  }
  
  /**
   * Update tool properties from options
   */
  protected updateToolProperties(options: ToolOption[]): void {
    options.forEach(option => {
      switch (option.id) {
        case 'size':
          this.strokeWidth = option.value as number
          break
      }
    })
  }
  
  // Override DrawingTool methods since we use Fabric's drawing mode
  protected beginStroke(): void {
    // Not used - Fabric handles drawing
  }
  
  protected updateStroke(): void {
    // Not used - Fabric handles drawing
  }
  
  protected finalizeStroke(): void {
    // Not used - Fabric handles drawing
  }
}

// Export singleton instance
export const eraserTool = new EraserTool() 