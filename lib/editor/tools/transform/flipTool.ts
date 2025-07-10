import { FlipHorizontal2 } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { CanvasObject, Transform } from '@/lib/editor/canvas/types'
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
        const before = { ...target.transform }
        
        // Flip by negating the appropriate scale
        if (direction === 'horizontal') {
          target.transform.scaleX = -target.transform.scaleX
        } else {
          target.transform.scaleY = -target.transform.scaleY
        }
        
        // Update Konva node
        target.node.setAttrs({
          scaleX: target.transform.scaleX,
          scaleY: target.transform.scaleY
        })
        
        const after = { ...target.transform }
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
      for (const layerId of affectedLayers) {
        const layer = canvas.state.layers.find(l => l.id === layerId)
        if (layer) {
          layer.konvaLayer.batchDraw()
        }
      }
      
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
    const selection = canvas.state.selection
    
    if (selection?.type === 'objects') {
      // Flip selected objects
      return selection.objectIds
        .map(id => this.findObject(id))
        .filter((obj): obj is CanvasObject => obj !== null && !obj.locked)
    } else {
      // Flip all objects on active layer
      const activeLayer = canvas.state.layers.find(l => l.id === canvas.state.activeLayerId)
      if (activeLayer) {
        return activeLayer.objects.filter(obj => !obj.locked && obj.visible)
      }
      return []
    }
  }
  
  /**
   * Find an object by ID
   */
  private findObject(objectId: string): CanvasObject | null {
    const canvas = this.getCanvas()
    for (const layer of canvas.state.layers) {
      const obj = layer.objects.find(o => o.id === objectId)
      if (obj) return obj
    }
    return null
  }
  
  /**
   * Find the layer containing an object
   */
  private findLayerForObject(obj: CanvasObject) {
    const canvas = this.getCanvas()
    return canvas.state.layers.find(layer => 
      layer.objects.some(o => o.id === obj.id)
    )
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
      const originalSelection = canvas.state.selection
      
      // Temporarily set selection to target objects
      canvas.state.selection = {
        type: 'objects',
        objectIds: targetObjects.map(obj => obj.id)
      }
      
      await this.applyFlip(direction)
      
      // Restore original selection
      canvas.state.selection = originalSelection
    } else {
      await this.applyFlip(direction)
    }
  }
}

// Export singleton instance
export const flipTool = new FlipTool() 