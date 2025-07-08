import { Eraser } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricObject, Path, Point, TEvent, TPointerEvent } from 'fabric'
import { PencilBrush } from 'fabric'
import { DrawingTool } from '../base/DrawingTool'
import type { ToolOption } from '@/store/toolOptionsStore'
import type { CustomFabricObjectProps } from '@/types'
import { LayerAwareMixin } from '../utils/layerAware'
import { useHistoryStore } from '@/store/historyStore'
import { AddObjectCommand } from '@/lib/editor/commands/canvas'

// Type augmentation for Path with eraser properties
type PathWithEraserProps = Path & {
  globalCompositeOperation?: GlobalCompositeOperation
}

/**
 * Custom Eraser Brush that properly handles destination-out composite operation
 * 
 * The key to avoiding the "shooting from side" issue is to ensure the brush
 * is properly initialized and the composite operation is set at the right time.
 */
class EraserBrush extends PencilBrush {
  constructor(canvas: Canvas) {
    super(canvas)
    
    // Set default properties
    this.width = 20
    this.color = 'rgba(0,0,0,1)' // Color doesn't matter for eraser
    
    // Reset any internal state that might cause position issues
    this.resetBrushState()
  }
  
  /**
   * Reset internal brush state to prevent position carryover
   */
  private resetBrushState(): void {
    // Access internal properties using type assertion to PencilBrush internals
    interface PencilBrushInternal {
      _points?: unknown[]
      _mouseDownPoint?: unknown
      _currentMouseCoords?: unknown
    }
    
    const brush = this as unknown as PencilBrushInternal
    
    // Reset the points array that tracks the stroke path
    if (brush._points) {
      brush._points = []
    }
    
    // Reset any cached mouse positions
    if (brush._mouseDownPoint) {
      brush._mouseDownPoint = null
    }
    
    // Clear any other internal state that might affect positioning
    if (brush._currentMouseCoords) {
      brush._currentMouseCoords = null
    }
  }
  
  /**
   * Override onMouseDown to ensure clean state for each stroke
   */
  onMouseDown(pointer: Point, options: TEvent<TPointerEvent>): boolean | void {
    // Reset state before starting new stroke
    this.resetBrushState()
    
    // Call parent implementation
    return super.onMouseDown(pointer, options)
  }
  
  /**
   * Override to handle the drawing context properly
   * This is called during the drawing operation
   */
  _render(ctx?: CanvasRenderingContext2D): void {
    if (!ctx) {
      console.warn('EraserBrush: No rendering context available')
      return
    }
    
    // Store the original composite operation
    const originalComposite = ctx.globalCompositeOperation
    
    // Temporarily set to destination-out for erasing
    ctx.globalCompositeOperation = 'destination-out'
    
    try {
      // Call the parent render method
      super._render(ctx)
    } finally {
      // Always restore the original composite operation
      ctx.globalCompositeOperation = originalComposite
    }
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
    
    // Clear any existing brush state from previous tools
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush = undefined
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
        // Use proper type assertion
        const eraserPath = path as PathWithEraserProps
        eraserPath.globalCompositeOperation = 'destination-out'
        
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
          layerId: layerId,
          compositeOperation: eraserPath.globalCompositeOperation
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