import { Contrast } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import { FilterAppliedEvent, FilterRemovedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Invert Tool - Invert colors of images
 * Konva implementation with toggle functionality
 */
export class InvertTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.INVERT
  name = 'Invert'
  icon = Contrast
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Track state
  private isApplying = false
  
  protected setupTool(): void {
    // Set default action
    this.setOption('action', null)
  }
  
  protected cleanupTool(): void {
    // Reset state but keep filters applied
    this.isApplying = false
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'action' && value === 'toggle') {
      this.toggleInvert()
      // Reset the action
      this.setOption('action', null)
    }
  }
  
  /**
   * Toggle invert on/off
   */
  async toggleInvert(): Promise<void> {
    if (this.isApplying) return
    
    this.isApplying = true
    
    try {
      const targets = this.getTargetObjects()
      
      if (targets.length === 0) {
        console.warn('[InvertTool] No images to toggle')
        return
      }
      
      // Check if ANY of the target images already have invert applied
      const hasInvertApplied = targets.some(target => {
        if (target.type === 'image') {
          const imageNode = target.node as Konva.Image
          const filters = imageNode.filters() || []
          return filters.includes(Konva.Filters.Invert)
        }
        return false
      })
      
      // If any image has invert, remove from all. Otherwise, add to all.
      const shouldApplyInvert = !hasInvertApplied
      
      console.log(`[InvertTool] Toggling invert: currently=${hasInvertApplied}, willApply=${shouldApplyInvert}`)
      
      const targetIds: string[] = []
      
      for (const target of targets) {
        if (target.type === 'image') {
          if (shouldApplyInvert) {
            await this.applyInvertToImage(target)
          } else {
            await this.removeInvertFromImage(target)
          }
          targetIds.push(target.id)
        }
      }
      
      // Emit appropriate event if in ExecutionContext
      if (this.executionContext && targetIds.length > 0) {
        if (shouldApplyInvert) {
          await this.executionContext.emit(new FilterAppliedEvent(
            'canvas',
            'invert',
            {},
            targetIds,
            this.executionContext.getMetadata()
          ))
        } else {
          await this.executionContext.emit(new FilterRemovedEvent(
            'canvas',
            'invert',
            targetIds,
            this.executionContext.getMetadata()
          ))
        }
      }
      
    } finally {
      this.isApplying = false
    }
  }
  
  /**
   * Apply invert to a specific image object
   */
  private async applyInvertToImage(obj: CanvasObject): Promise<void> {
    const imageNode = obj.node as Konva.Image
    
    // Cache the image for filter application
    imageNode.cache()
    
    // Set up invert filter
    const filters = imageNode.filters() || []
    if (!filters.includes(Konva.Filters.Invert)) {
      filters.push(Konva.Filters.Invert)
      imageNode.filters(filters)
    }
    
    // Redraw
    const layer = this.findLayerForObject(obj)
    if (layer) {
      layer.konvaLayer.batchDraw()
    }
  }
  
  /**
   * Remove invert from a specific image object
   */
  private async removeInvertFromImage(obj: CanvasObject): Promise<void> {
    const imageNode = obj.node as Konva.Image
    
    // Remove invert filter
    const filters = imageNode.filters() || []
    const newFilters = filters.filter(f => f !== Konva.Filters.Invert)
    imageNode.filters(newFilters)
    
    // Clear cache if no filters remain
    if (newFilters.length === 0) {
      imageNode.clearCache()
    }
    
    // Redraw
    const layer = this.findLayerForObject(obj)
    if (layer) {
      layer.konvaLayer.batchDraw()
    }
  }
  
  /**
   * Get target objects based on selection or all images
   */
  private getTargetObjects(): CanvasObject[] {
    const canvas = this.getCanvas()
    const selection = canvas.state.selection
    
    if (selection?.type === 'objects') {
      // Apply to selected objects
      return selection.objectIds
        .map(id => this.findObject(id))
        .filter((obj): obj is CanvasObject => obj !== null && obj.type === 'image')
    } else {
      // Apply to all images
      const allImages: CanvasObject[] = []
      for (const layer of canvas.state.layers) {
        for (const obj of layer.objects) {
          if (obj.type === 'image' && !obj.locked && obj.visible) {
            allImages.push(obj)
          }
        }
      }
      return allImages
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
   * Apply invert for AI operations
   */
  async applyWithContext(apply: boolean, targetObjects?: CanvasObject[]): Promise<void> {
    if (targetObjects) {
      // Apply to specific objects
      for (const obj of targetObjects) {
        if (obj.type === 'image') {
          if (apply) {
            await this.applyInvertToImage(obj)
          } else {
            await this.removeInvertFromImage(obj)
          }
        }
      }
    } else {
      // Use toggle for general application
      await this.toggleInvert()
    }
  }
}

// Export singleton instance
export const invertTool = new InvertTool() 