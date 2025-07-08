import { Eraser } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricObject, Path } from 'fabric'
import { PencilBrush } from 'fabric'
import { DrawingTool } from '../base/DrawingTool'
import type { ToolOption } from '@/store/toolOptionsStore'
import type { CustomFabricObjectProps } from '@/types'
import { LayerAwareMixin } from '../utils/layerAware'
import { useHistoryStore } from '@/store/historyStore'
import { AddObjectCommand } from '@/lib/editor/commands/canvas'

/**
 * Custom Eraser Brush that uses destination-out composite operation
 */
class EraserBrush extends PencilBrush {
  constructor(canvas: Canvas) {
    super(canvas)
  }
  
  /**
   * Override to use destination-out for erasing
   */
  _render(ctx: CanvasRenderingContext2D): void {
    ctx.globalCompositeOperation = 'destination-out'
    super._render(ctx)
    ctx.globalCompositeOperation = 'source-over'
  }
}

/**
 * Eraser Tool - Removes content by drawing transparent paths
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
  protected strokeColor = 'rgba(0,0,0,1)' // Color doesn't matter for eraser
  protected strokeWidth = 20
  protected opacity = 100
  
  // Eraser-specific properties
  private brush: PencilBrush | null = null
  
  /**
   * Tool setup - enable eraser mode
   */
  protected setupTool(canvas: Canvas): void {
    // Check if we can draw on the active layer
    if (!LayerAwareMixin.canDrawOnActiveLayer()) {
      console.warn('Cannot erase on locked or hidden layer')
      return
    }
    
    // Enable drawing mode
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
      const event = e as { path: Path }
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
    // For eraser, we always use full opacity
    this.brush.color = 'rgba(0,0,0,1)'
  }
  
  /**
   * Handle path creation - record command and add to layer
   */
  private handlePathCreated(path: Path): void {
    if (!this.canvas) return
    
    this.track('pathCreated', () => {
      try {
        // Remove the path temporarily (it was already added by Fabric)
        this.canvas!.remove(path)
        
        // Set the composite operation for erasing
        path.set('globalCompositeOperation', 'destination-out')
        
        // Add the path using LayerAwareMixin to properly associate with layer
        const context = { canvas: this.canvas! }
        LayerAwareMixin.addObjectToLayer.call(context, path as FabricObject)
        
        // Create and execute command for history
        const pathWithProps = path as Path & CustomFabricObjectProps
        const layerId = pathWithProps.layerId
        const command = new AddObjectCommand(this.canvas!, path as FabricObject, layerId)
        useHistoryStore.getState().executeCommand(command)
        
        console.log('Eraser stroke created:', {
          width: this.strokeWidth,
          layerId: layerId
        })
      } catch (error) {
        console.error('Error creating eraser stroke:', error)
        // Re-add the path if there was an error
        if (!this.canvas!.contains(path)) {
          this.canvas!.add(path)
        }
      }
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
        case 'opacity':
          // Opacity is ignored for eraser
          this.opacity = 100
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