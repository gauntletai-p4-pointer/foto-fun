import { Palette } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import { FilterAppliedEvent, FilterRemovedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Grayscale Tool - Convert images to grayscale
 * Konva implementation with toggle functionality
 */
export class GrayscaleTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.GRAYSCALE
  name = 'Grayscale'
  icon = Palette
  cursor = 'default'
  shortcut = 'G'
  
  // Track grayscale state
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
      this.toggleGrayscale()
      // Reset the action
      this.setOption('action', null)
    }
  }
  
  /**
   * Toggle grayscale on/off
   */
  async toggleGrayscale(): Promise<void> {
    if (this.isApplying) return
    
    this.isApplying = true
    
    try {
      const targets = this.getTargetObjects()
      
      if (targets.length === 0) {
        console.warn('[GrayscaleTool] No images to toggle')
        return
      }
      
      // Check if ANY of the target images already have grayscale applied
      const hasGrayscaleApplied = targets.some(target => {
        if (target.type === 'image') {
          const imageNode = target.node as Konva.Image
          const filters = imageNode.filters() || []
          return filters.includes(Konva.Filters.Grayscale)
        }
        return false
      })
      
      // If any image has grayscale, remove from all. Otherwise, add to all.
      const shouldApplyGrayscale = !hasGrayscaleApplied
      
      console.log(`[GrayscaleTool] Toggling grayscale: currently=${hasGrayscaleApplied}, willApply=${shouldApplyGrayscale}`)
      
      const targetIds: string[] = []
      
      for (const target of targets) {
        if (target.type === 'image') {
          if (shouldApplyGrayscale) {
            await this.applyGrayscaleToImage(target)
          } else {
            await this.removeGrayscaleFromImage(target)
          }
          targetIds.push(target.id)
        }
      }
      
      // Emit appropriate event if in ExecutionContext
      if (this.executionContext && targetIds.length > 0) {
        if (shouldApplyGrayscale) {
          await this.executionContext.emit(new FilterAppliedEvent(
            'canvas',
            'grayscale',
            {},
            targetIds,
            this.executionContext.getMetadata()
          ))
        } else {
          await this.executionContext.emit(new FilterRemovedEvent(
            'canvas',
            'grayscale',
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
   * Apply grayscale to a specific image object
   */
  private async applyGrayscaleToImage(obj: CanvasObject): Promise<void> {
    const imageNode = obj.node as Konva.Image
    
    // Cache the image for filter application
    imageNode.cache()
    
    // Set up grayscale filter
    const filters = imageNode.filters() || []
    if (!filters.includes(Konva.Filters.Grayscale)) {
      filters.push(Konva.Filters.Grayscale)
      imageNode.filters(filters)
    }
    
    // Redraw
    const layer = this.findLayerForObject(obj)
    if (layer) {
      layer.konvaLayer.batchDraw()
    }
  }
  
  /**
   * Remove grayscale from a specific image object
   */
  private async removeGrayscaleFromImage(obj: CanvasObject): Promise<void> {
    const imageNode = obj.node as Konva.Image
    
    // Remove grayscale filter
    const filters = imageNode.filters() || []
    const newFilters = filters.filter(f => f !== Konva.Filters.Grayscale)
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
   * Apply grayscale for AI operations
   */
  async applyWithContext(apply: boolean, targetObjects?: CanvasObject[]): Promise<void> {
    if (targetObjects) {
      // Apply to specific objects
      for (const obj of targetObjects) {
        if (obj.type === 'image') {
          if (apply) {
            await this.applyGrayscaleToImage(obj)
          } else {
            await this.removeGrayscaleFromImage(obj)
          }
        }
      }
    } else {
      // Use toggle for general application
      await this.toggleGrayscale()
    }
  }
}

// Export singleton instance
export const grayscaleTool = new GrayscaleTool() 