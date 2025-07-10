import { Droplet } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import { FilterAppliedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Saturation Tool - Adjust image color saturation
 * Konva implementation with HSL manipulation
 */
export class SaturationTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.SATURATION
  name = 'Saturation'
  icon = Droplet
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Track current adjustment
  private currentAdjustment = 0
  private isAdjusting = false
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Check for existing saturation adjustments
    const selection = canvas.state.selection
    if (selection?.type === 'objects') {
      const firstObject = this.findObject(selection.objectIds[0])
      if (firstObject && firstObject.type === 'image') {
        const imageNode = firstObject.node as Konva.Image
        const filters = imageNode.filters() || []
        if (filters.includes(Konva.Filters.HSL)) {
          // Get current saturation value
          const saturation = imageNode.saturation() || 0
          this.currentAdjustment = saturation
          this.setOption('adjustment', saturation)
        }
      }
    }
    
    // Set default adjustment
    this.setOption('adjustment', this.currentAdjustment)
  }
  
  protected cleanupTool(): void {
    // Reset state but keep filters applied
    this.isAdjusting = false
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'adjustment' && typeof value === 'number') {
      this.applySaturation(value)
    }
  }
  
  /**
   * Apply saturation adjustment
   */
  async applySaturation(adjustment: number): Promise<void> {
    if (this.isAdjusting) return
    
    this.isAdjusting = true
    
    try {
      const targets = this.getTargetObjects()
      
      if (targets.length === 0) {
        console.warn('[SaturationTool] No images to adjust')
        return
      }
      
      const targetIds: string[] = []
      
      for (const target of targets) {
        if (target.type === 'image') {
          await this.applySaturationToImage(target, adjustment)
          targetIds.push(target.id)
        }
      }
      
      // Emit event if in ExecutionContext
      if (this.executionContext && targetIds.length > 0) {
        await this.executionContext.emit(new FilterAppliedEvent(
          'canvas',
          'saturation',
          { saturation: adjustment },
          targetIds,
          this.executionContext.getMetadata()
        ))
      }
      
      this.currentAdjustment = adjustment
    } finally {
      this.isAdjusting = false
    }
  }
  
  /**
   * Apply saturation to a specific image object
   */
  private async applySaturationToImage(obj: CanvasObject, adjustment: number): Promise<void> {
    const imageNode = obj.node as Konva.Image
    
    // Cache the image for filter application
    imageNode.cache()
    
    // Set up HSL filter
    const filters = imageNode.filters() || []
    if (!filters.includes(Konva.Filters.HSL)) {
      filters.push(Konva.Filters.HSL)
      imageNode.filters(filters)
    }
    
    // Apply saturation (Konva expects -100 to 100 range)
    imageNode.saturation(adjustment)
    
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
    } else if (selection?.type === 'rectangle' || selection?.type === 'ellipse' || selection?.type === 'pixel') {
      // For pixel selections, we'd need different handling
      console.warn('[SaturationTool] Pixel-based selections not yet implemented')
      return []
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
   * Apply saturation for AI operations with selection context
   */
  async applyWithContext(adjustment: number, targetObjects?: CanvasObject[]): Promise<void> {
    if (targetObjects) {
      // Apply to specific objects
      for (const obj of targetObjects) {
        if (obj.type === 'image') {
          await this.applySaturationToImage(obj, adjustment)
        }
      }
    } else {
      // Use normal apply
      await this.applySaturation(adjustment)
    }
  }
}

// Export singleton instance
export const saturationTool = new SaturationTool() 