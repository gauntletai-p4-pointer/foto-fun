import { FlipHorizontal2 } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { Transform } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { ObjectsTransformedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Flip Tool - Flip objects horizontally or vertically
 * Konva implementation with proper scale transformation
 */
export class FlipTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.FLIP
  name = 'Flip'
  icon = FlipHorizontal2
  cursor = 'default'
  shortcut = 'F'
  
  // Track state
  private isFlipping = false
  
  protected setupTool(): void {
    // Set default action
    this.setOption('flipAction', null)
  }
  
  protected cleanupTool(): void {
    // Reset state
    this.isFlipping = false
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'flipAction') {
      if (value === 'horizontal') {
        this.applyFlip('horizontal')
        this.setOption('flipAction', null)
      } else if (value === 'vertical') {
        this.applyFlip('vertical')
        this.setOption('flipAction', null)
      }
    }
  }
  
  /**
   * Apply flip transformation
   */
  async applyFlip(direction: 'horizontal' | 'vertical'): Promise<void> {
    if (this.isFlipping) return
    
    this.isFlipping = true
    
    try {
      const targets = this.getTargetObjects()
      
      if (targets.length === 0) {
        console.warn('[FlipTool] No objects to flip')
        return
      }
      
      console.log(`[FlipTool] Flipping ${targets.length} object(s) ${direction}`)
      
      const transformedObjects: Array<{
        objectId: string
        before: Transform
        after: Transform
      }> = []
      
      // Apply flip to each target
      for (const target of targets) {
        const before = {
          x: target.x,
          y: target.y,
          scaleX: target.scaleX,
          scaleY: target.scaleY,
          rotation: target.rotation,
          skewX: 0,
          skewY: 0
        }
        
        // Calculate new scale values
        const newScaleX = direction === 'horizontal' ? -target.scaleX : target.scaleX
        const newScaleY = direction === 'vertical' ? -target.scaleY : target.scaleY
        
        // Update object through canvas manager
        const canvas = this.getCanvas()
        await canvas.updateObject(target.id, {
          scaleX: newScaleX,
          scaleY: newScaleY
        })
        
        const after = {
          x: target.x,
          y: target.y,
          scaleX: newScaleX,
          scaleY: newScaleY,
          rotation: target.rotation,
          skewX: 0,
          skewY: 0
        }
        transformedObjects.push({ objectId: target.id, before, after })
      }
      
      // Redraw all affected layers
      const affectedLayers = new Set<string>()
      for (const target of targets) {
        const layer = this.findLayerForObject(target)
        if (layer) {
          affectedLayers.add(layer.id)
        }
      }
      
      const canvas = this.getCanvas()
      // Redraw the canvas - objects are managed directly now
      canvas.render()
      
      // Emit event if in ExecutionContext
      if (this.executionContext && transformedObjects.length > 0) {
        await this.executionContext.emit(new ObjectsTransformedEvent(
          'canvas',
          transformedObjects.map(t => ({
            objectId: t.objectId,
            previousTransform: { ...t.before } as unknown as Record<string, unknown>,
            newTransform: { ...t.after } as unknown as Record<string, unknown>
          })),
          this.executionContext.getMetadata()
        ))
      }
      
    } finally {
      this.isFlipping = false
    }
  }
  
  /**
   * Get target objects based on selection
   */
  private getTargetObjects(): CanvasObject[] {
    const canvas = this.getCanvas()
    const selectedIds = Array.from(canvas.state.selectedObjectIds)
    
    if (selectedIds.length > 0) {
      // Flip selected objects
      return selectedIds
        .map(id => this.findObject(id))
        .filter((obj): obj is CanvasObject => obj !== null && !obj.locked)
    } else {
      // Flip all visible, unlocked objects
      return canvas.getAllObjects().filter(obj => !obj.locked && obj.visible)
    }
  }
  
  /**
   * Find an object by ID
   */
  private findObject(objectId: string): CanvasObject | null {
    const canvas = this.getCanvas()
    return canvas.getObject(objectId)
  }
  
  /**
   * Find the layer containing an object (no longer needed with object-based model)
   */
  private findLayerForObject(obj: CanvasObject) {
    // Objects are managed directly now, no need for layer lookup
    return null
  }
  
  /**
   * Apply flip for AI operations
   */
  async applyWithContext(
    direction: 'horizontal' | 'vertical',
    targetObjects?: CanvasObject[]
  ): Promise<void> {
    if (targetObjects) {
      // Store current targets and apply to specific objects
      const canvas = this.getCanvas()
      const originalSelection = Array.from(canvas.state.selectedObjectIds)
      
      // Temporarily set selection to target objects
      canvas.selectMultiple(targetObjects.map(obj => obj.id))
      
      await this.applyFlip(direction)
      
      // Restore original selection
      canvas.selectMultiple(originalSelection)
    } else {
      await this.applyFlip(direction)
    }
  }
}

// Export singleton instance
export const flipTool = new FlipTool() 