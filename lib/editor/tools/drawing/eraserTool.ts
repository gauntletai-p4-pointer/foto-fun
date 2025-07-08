/**
 * ERASER TOOL - NOT CURRENTLY ACTIVE
 * 
 * This file documents our attempts to implement an eraser tool in Fabric.js.
 * The eraser tool has been temporarily removed from the UI due to fundamental
 * incompatibilities between pixel-based erasing and Fabric.js's object-based architecture.
 * 
 * APPROACHES ATTEMPTED:
 * 
 * 1. CUSTOM RENDER WITH DESTINATION-OUT (Current Implementation)
 *    - Created paths that override _render to use globalCompositeOperation = 'destination-out'
 *    - ISSUE: Fabric.js re-renders all objects fresh each frame, so the composite
 *      operation doesn't create persistent "holes" - it only affects pixels during
 *      that specific render call
 *    - RESULT: No actual erasing occurs
 * 
 * 2. CONVERT TO IMAGE AFTER EACH STROKE
 *    - Render canvas to image, apply eraser stroke with destination-out, replace canvas
 *    - ISSUE: Image shrinks to content bounds, losing canvas dimensions
 *    - ISSUE: Loses all object information, making it impossible to edit individual elements
 *    - ISSUE: Poor performance with multiple strokes
 *    - RESULT: Technically works but destroys the editing experience
 * 
 * 3. PENCILBRUSH WITH DESTINATION-OUT
 *    - Override PencilBrush's _render method to apply destination-out during drawing
 *    - ISSUE: Same as #1 - the composite operation is temporary
 *    - RESULT: Creates black paths instead of erasing
 * 
 * 4. BACKGROUND IMAGE APPROACH
 *    - Set canvas content as background, draw eraser strokes on top
 *    - ISSUE: Complex state management between background and foreground
 *    - ISSUE: Still doesn't create true erasing of objects
 *    - RESULT: Overly complex with poor results
 * 
 * POTENTIAL SOLUTIONS (Not Implemented):
 * 
 * 1. CLIPPING MASKS
 *    - Create inverted clip paths for each eraser stroke
 *    - CONS: Performance degrades exponentially with more strokes
 *    - CONS: Complex intersection calculations for every render
 *    - CONS: Export/serialization becomes extremely complex
 *    - CONS: Visual artifacts at clip boundaries
 * 
 * 2. PIXEL-BASED CANVAS LAYER
 *    - Maintain a separate 2D canvas for pixel operations
 *    - CONS: Synchronization complexity between Fabric objects and pixel layer
 *    - CONS: Breaks the unified editing model
 *    - CONS: Z-ordering becomes problematic
 * 
 * 3. SHADER-BASED APPROACH
 *    - Use WebGL shaders for real-time erasing
 *    - CONS: Requires complete rendering pipeline overhaul
 *    - CONS: Not compatible with Fabric.js's architecture
 *    - CONS: Browser compatibility issues
 * 
 * FUNDAMENTAL ISSUE:
 * Fabric.js is designed as an object-based graphics library where everything
 * is a discrete, editable object. Erasing is inherently a pixel-based operation
 * that removes parts of these objects. This creates a fundamental mismatch.
 * 
 * Most professional web-based image editors (Photopea, Photoshop Web) use
 * pixel-based canvases for this reason, while vector editors (Figma, Illustrator)
 * typically don't offer pixel-level erasing or implement it in very limited contexts.
 * 
 * RECOMMENDATION:
 * If erasing is a critical feature, consider:
 * 1. Implementing a "flatten to image" operation before erasing
 * 2. Using a different canvas library that supports pixel operations
 * 3. Limiting erasing to specific contexts (e.g., only on raster layers)
 * 4. Implementing object-based "masking" instead of true erasing
 */

import { Eraser } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, Path } from 'fabric'
import { PencilBrush } from 'fabric'
import { DrawingTool } from '../base/DrawingTool'
import type { ToolOption } from '@/store/toolOptionsStore'
import { LayerAwareMixin } from '../utils/layerAware'

/**
 * Custom Eraser Path that renders with destination-out
 */
interface EraserPath extends Path {
  isEraserPath: boolean
}

/**
 * Eraser Tool - Creates paths that erase when rendered
 * 
 * This implementation:
 * 1. Creates normal paths but marks them as eraser paths
 * 2. Overrides their render method to use destination-out
 * 3. Keeps paths as objects for undo/redo support
 */
class EraserTool extends DrawingTool {
  // Tool identification
  id = TOOL_IDS.ERASER
  name = 'Eraser Tool'
  icon = Eraser
  cursor = 'crosshair'
  shortcut = 'E'
  
  // Tool properties
  protected strokeColor = 'rgba(0,0,0,1)'
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
    
    // Create a standard PencilBrush
    this.brush = new PencilBrush(canvas)
    this.brush.width = this.strokeWidth
    this.brush.color = 'rgba(0,0,0,1)' // Black for full erasing
    
    // Set as the active brush
    canvas.freeDrawingBrush = this.brush
    
    // Subscribe to option changes
    this.subscribeToToolOptions((options) => {
      this.updateToolProperties(options)
      this.updateBrushSettings()
    })
    
    // Listen for path creation
    this.addCanvasEvent('path:created', (e: unknown) => {
      const event = e as { path: Path }
      this.convertToEraserPath(event.path)
    })
    
    canvas.renderAll()
  }
  
  /**
   * Convert a regular path to an eraser path
   */
  private convertToEraserPath(path: Path): void {
    if (!this.canvas) return
    
    // Mark as eraser path
    const eraserPath = path as EraserPath
    eraserPath.isEraserPath = true
    
    // Make it non-interactive
    eraserPath.selectable = false
    eraserPath.evented = false
    
    // Override the _render method to use destination-out
    const originalRender = eraserPath._render.bind(eraserPath)
    eraserPath._render = function(ctx: CanvasRenderingContext2D) {
      // Save current settings
      const prevOperation = ctx.globalCompositeOperation
      const prevAlpha = ctx.globalAlpha
      
      // Set eraser mode
      ctx.globalCompositeOperation = 'destination-out'
      ctx.globalAlpha = 1 // Full opacity for complete erasing
      
      // Render the path
      originalRender(ctx)
      
      // Restore settings
      ctx.globalAlpha = prevAlpha
      ctx.globalCompositeOperation = prevOperation
    }
    
    console.log('Eraser path created:', {
      width: this.strokeWidth
    })
    
    this.canvas.renderAll()
  }
  
  /**
   * Tool cleanup - disable eraser mode
   */
  protected cleanup(canvas: Canvas): void {
    // Disable drawing mode
    canvas.isDrawingMode = false
    canvas.selection = true
    
    // Clear brush
    canvas.freeDrawingBrush = undefined
    this.brush = null
    
    // Optionally: Flatten eraser paths into the image
    // This would require converting all objects to a single image
    // For now, we keep them as paths for undo/redo support
    
    canvas.renderAll()
  }
  
  /**
   * Update brush settings
   */
  private updateBrushSettings(): void {
    if (!this.brush || !this.canvas) return
    
    this.brush.width = this.strokeWidth
    this.brush.color = 'rgba(0,0,0,1)'
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
          // Opacity is ignored for eraser - always full
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