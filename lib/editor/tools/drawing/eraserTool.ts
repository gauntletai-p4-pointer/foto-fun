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
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point, CanvasObject } from '@/lib/editor/canvas/types'
import { StrokeAddedEvent } from '@/lib/events/canvas/ToolEvents'
import { nanoid } from 'nanoid'

/**
 * Eraser Tool - Pixel-based erasing with proper composite operation
 * Konva implementation that actually erases pixels
 */
export class EraserTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.ERASER
  name = 'Eraser Tool'
  icon = Eraser
  cursor = 'crosshair'
  shortcut = 'E'
  
  // Erasing state
  private isErasing = false
  private eraserLine: Konva.Line | null = null
  private lastPoint: Point | null = null
  private currentStrokeId: string | null = null
  private strokePoints: number[] = []
  
  protected setupTool(): void {
    // Set default options
    this.setOption('size', 20)
    this.setOption('hardness', 100)
    this.setOption('opacity', 100)
  }
  
  protected cleanupTool(): void {
    // Clean up any active stroke
    if (this.eraserLine) {
      this.eraserLine.destroy()
      this.eraserLine = null
    }
    
    // Reset state
    this.isErasing = false
    this.lastPoint = null
    this.currentStrokeId = null
    this.strokePoints = []
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    const canvas = this.getCanvas()
    const activeLayer = canvas.getActiveLayer()
    
    if (!activeLayer || activeLayer.locked) {
      console.warn('Cannot erase on locked or no active layer')
      return
    }
    
    this.isErasing = true
    this.lastPoint = { x: event.point.x, y: event.point.y }
    this.currentStrokeId = nanoid()
    this.strokePoints = [event.point.x, event.point.y]
    
    // Create eraser stroke
    this.eraserLine = new Konva.Line({
      points: this.strokePoints,
      stroke: '#000000', // Color doesn't matter with destination-out
      strokeWidth: this.getOption('size') as number || 20,
      globalCompositeOperation: 'destination-out',
      lineCap: 'round',
      lineJoin: 'round',
      tension: 0.5,
      listening: false
    })
    
    // Add to the active layer
    activeLayer.konvaLayer.add(this.eraserLine)
    activeLayer.konvaLayer.batchDraw()
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isErasing || !this.eraserLine || !this.lastPoint) return
    
    const canvas = this.getCanvas()
    const activeLayer = canvas.getActiveLayer()
    if (!activeLayer) return
    
    // Add points to the eraser path
    this.strokePoints.push(event.point.x, event.point.y)
    this.eraserLine.points(this.strokePoints)
    
    // Update last point
    this.lastPoint = { x: event.point.x, y: event.point.y }
    
    // Redraw the layer
    activeLayer.konvaLayer.batchDraw()
  }
  
  async onMouseUp(event: ToolEvent): Promise<void> {
    if (!this.isErasing || !this.eraserLine || !this.currentStrokeId) return
    
    this.isErasing = false
    
    const canvas = this.getCanvas()
    const activeLayer = canvas.getActiveLayer()
    if (!activeLayer) return
    
    // Finalize the stroke
    this.strokePoints.push(event.point.x, event.point.y)
    this.eraserLine.points(this.strokePoints)
    
    // For proper erasing, we need to flatten the erased content
    // This is done by caching the layer and redrawing
    activeLayer.konvaLayer.cache()
    activeLayer.konvaLayer.drawHit()
    
    // Emit event if in ExecutionContext
    if (this.executionContext) {
      await this.executionContext.emit(new StrokeAddedEvent(
        'canvas',
        this.currentStrokeId,
        {
          points: [...this.strokePoints],
          color: '#000000',
          width: this.getOption('size') as number || 20,
          opacity: 1,
          layerId: activeLayer.id
        },
        this.executionContext.getMetadata()
      ))
    }
    
    // Clean up
    this.eraserLine = null
    this.lastPoint = null
    this.currentStrokeId = null
    this.strokePoints = []
  }
  
  onKeyDown(event: KeyboardEvent): void {
    // Handle size adjustment with bracket keys
    if (event.key === '[') {
      const currentSize = (this.getOption('size') as number) || 20
      this.setOption('size', Math.max(1, currentSize - 5))
    } else if (event.key === ']') {
      const currentSize = (this.getOption('size') as number) || 20
      this.setOption('size', Math.min(200, currentSize + 5))
    }
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    // Update cursor size preview
    if (key === 'size' && typeof value === 'number') {
      // Could update a cursor preview here
      const canvas = this.getCanvas()
      canvas.konvaStage.container().style.cursor = `crosshair`
    }
  }
  
  /**
   * Apply eraser to specific objects (for AI operations)
   */
  async applyToObject(
    object: CanvasObject,
    options: { size: number; hardness: number }
  ): Promise<void> {
    // For AI operations, we might want to mask parts of an object
    // This would require creating a clipping mask
    console.log('Applying eraser to object:', object, options)
    
    // Implementation would depend on the specific requirements
    // For now, this is a placeholder
  }
}

// Export singleton instance
export const eraserTool = new EraserTool() 