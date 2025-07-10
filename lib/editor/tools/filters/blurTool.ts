import { Brush } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import { FilterAppliedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Blur Tool - Apply gaussian blur to images
 * Konva implementation with proper filter support
 */
export class BlurTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.BLUR
  name = 'Blur'
  icon = Brush
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Track current blur value
  private currentBlur = 0
  private isApplying = false
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Check for existing blur on selected objects
    const selection = canvas.state.selection
    if (selection?.type === 'objects') {
      const firstObject = this.findObject(selection.objectIds[0])
      if (firstObject && firstObject.type === 'image') {
        const imageNode = firstObject.node as Konva.Image
        const filters = imageNode.filters() || []
        if (filters.includes(Konva.Filters.Blur)) {
          // Get current blur value
          const blurRadius = imageNode.blurRadius() || 0
          this.currentBlur = blurRadius
          this.setOption('blur', blurRadius)
        }
      }
    }
    
    // Set default blur value
    this.setOption('blur', this.currentBlur)
  }
  
  protected cleanupTool(): void {
    // Reset state but keep filters applied
    this.isApplying = false
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'blur' && typeof value === 'number') {
      this.applyBlur(value)
    }
  }
  
  /**
   * Apply blur filter
   */
  async applyBlur(blurValue: number): Promise<void> {
    if (this.isApplying) return
    
    this.isApplying = true
    
    try {
      const targets = this.getTargetObjects()
      
      if (targets.length === 0) {
        console.warn('[BlurTool] No images to blur')
        return
      }
      
      const targetIds: string[] = []
      
      for (const target of targets) {
        if (target.type === 'image') {
          await this.applyBlurToImage(target, blurValue)
          targetIds.push(target.id)
        }
      }
      
      // Emit event if in ExecutionContext
      if (this.executionContext && targetIds.length > 0) {
        await this.executionContext.emit(new FilterAppliedEvent(
          'canvas',
          'blur',
          { blur: blurValue },
          targetIds,
          this.executionContext.getMetadata()
        ))
      }
      
      this.currentBlur = blurValue
    } finally {
      this.isApplying = false
    }
  }
  
  /**
   * Apply blur to a specific image object
   */
  private async applyBlurToImage(obj: CanvasObject, blurRadius: number): Promise<void> {
    const imageNode = obj.node as Konva.Image
    
    // Cache the image for filter application
    imageNode.cache()
    
    // Set up blur filter
    const filters = imageNode.filters() || []
    
    if (blurRadius > 0) {
      // Add or keep blur filter
      if (!filters.includes(Konva.Filters.Blur)) {
        filters.push(Konva.Filters.Blur)
        imageNode.filters(filters)
      }
      
      // Apply blur radius (Konva uses pixel radius directly)
      imageNode.blurRadius(blurRadius)
    } else {
      // Remove blur filter
      const newFilters = filters.filter(f => f !== Konva.Filters.Blur)
      imageNode.filters(newFilters)
      
      // Clear cache if no filters remain
      if (newFilters.length === 0) {
        imageNode.clearCache()
      }
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
    } else if (selection?.type === 'rectangle' || selection?.type === 'ellipse' || selection?.type === 'pixel') {
      // For pixel selections, we'd need different handling
      console.warn('[BlurTool] Pixel-based selections not yet implemented for blur')
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
   * Apply blur for AI operations with selection context
   */
  async applyWithContext(blurRadius: number, targetObjects?: CanvasObject[]): Promise<void> {
    if (targetObjects) {
      // Apply to specific objects
      for (const obj of targetObjects) {
        if (obj.type === 'image') {
          await this.applyBlurToImage(obj, blurRadius)
        }
      }
    } else {
      // Use normal apply
      await this.applyBlur(blurRadius)
    }
  }
}

// Export singleton instance
export const blurTool = new BlurTool() 