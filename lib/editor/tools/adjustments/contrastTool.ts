import { Contrast } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import { FilterAppliedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Contrast Tool - Adjust image contrast
 * Konva implementation with pixel-level contrast adjustment
 */
export class ContrastTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.CONTRAST
  name = 'Contrast'
  icon = Contrast
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Track current adjustment
  private currentAdjustment = 0
  private isAdjusting = false
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Check for existing contrast adjustments
    const selection = canvas.state.selection
    if (selection?.type === 'objects') {
      // Check if selected objects have contrast filters
      const firstObject = this.findObject(selection.objectIds[0])
      if (firstObject && firstObject.type === 'image') {
        const imageNode = firstObject.node as Konva.Image
        const filters = imageNode.filters() || []
        if (filters.includes(Konva.Filters.Contrast)) {
          // Get current contrast value
          const contrast = imageNode.contrast() || 0
          this.currentAdjustment = contrast
          this.setOption('adjustment', contrast * 100)
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
      this.applyContrast(value)
    }
  }
  
  /**
   * Apply contrast adjustment
   */
  async applyContrast(contrast: number): Promise<void> {
    if (this.isAdjusting) return
    
    this.isAdjusting = true
    
    try {
      // Get target objects
      const targets = this.getTargetObjects()
      
      if (targets.length === 0) {
        console.warn('[ContrastTool] No images to adjust')
        return
      }
      
      const targetIds: string[] = []
      
      for (const target of targets) {
        if (target.type === 'image') {
          await this.applyContrastToImage(target, contrast)
          targetIds.push(target.id)
        }
      }
      
      // Emit event if in ExecutionContext
      if (this.executionContext && targetIds.length > 0) {
        await this.executionContext.emit(new FilterAppliedEvent(
          'canvas',
          'contrast',
          { contrast },
          targetIds,
          this.executionContext.getMetadata()
        ))
      }
      
      this.currentAdjustment = contrast
    } finally {
      this.isAdjusting = false
    }
  }
  
  /**
   * Apply contrast to a specific image object
   */
  private async applyContrastToImage(obj: CanvasObject, contrast: number): Promise<void> {
    const imageNode = obj.node as Konva.Image
    
    // Cache the image for filter application
    imageNode.cache()
    
    // Set up contrast filter
    const filters = imageNode.filters() || []
    if (!filters.includes(Konva.Filters.Contrast)) {
      filters.push(Konva.Filters.Contrast)
      imageNode.filters(filters)
    }
    
    // Apply contrast (Konva expects -100 to 100 range)
    imageNode.contrast(contrast / 100)
    
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
      // For pixel selections, we'd need to apply to the pixel data directly
      // This is more complex and would require different handling
      console.warn('[ContrastTool] Pixel-based selections not yet implemented')
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
   * Apply contrast for AI operations with selection context
   */
  async applyWithContext(adjustment: number, targetObjects?: CanvasObject[]): Promise<void> {
    if (targetObjects) {
      // Apply to specific objects
      for (const obj of targetObjects) {
        if (obj.type === 'image') {
          await this.applyContrastToImage(obj, adjustment)
        }
      }
    } else {
      // Use normal apply
      await this.applyContrast(adjustment)
    }
  }
}

// Export singleton instance
export const contrastTool = new ContrastTool() 