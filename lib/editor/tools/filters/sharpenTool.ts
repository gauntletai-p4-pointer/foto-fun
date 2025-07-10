import { Focus } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import { FilterAppliedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Sharpen Tool - Apply unsharp mask filter to images
 * Konva implementation with proper filter support
 */
export class SharpenTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.SHARPEN
  name = 'Sharpen'
  icon = Focus
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Track current sharpen value
  private currentSharpen = 0
  private isApplying = false
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Check for existing sharpen on selected objects
    const selection = canvas.state.selection
    if (selection?.type === 'objects') {
      const firstObject = this.findObject(selection.objectIds[0])
      if (firstObject && firstObject.type === 'image') {
        const imageNode = firstObject.node as Konva.Image
        const filters = imageNode.filters() || []
        if (filters.includes(Konva.Filters.Enhance)) {
          // Konva uses Enhance filter for sharpening
          const enhance = imageNode.enhance() || 0
          this.currentSharpen = enhance * 100
          this.setOption('sharpen', this.currentSharpen)
        }
      }
    }
    
    // Set default sharpen value
    this.setOption('sharpen', this.currentSharpen)
  }
  
  protected cleanupTool(): void {
    // Reset state but keep filters applied
    this.isApplying = false
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'sharpen' && typeof value === 'number') {
      this.applySharpen(value)
    }
  }
  
  /**
   * Apply sharpen filter
   */
  async applySharpen(sharpenValue: number): Promise<void> {
    if (this.isApplying) return
    
    this.isApplying = true
    
    try {
      const targets = this.getTargetObjects()
      
      if (targets.length === 0) {
        console.warn('[SharpenTool] No images to sharpen')
        return
      }
      
      const targetIds: string[] = []
      
      for (const target of targets) {
        if (target.type === 'image') {
          await this.applySharpenToImage(target, sharpenValue)
          targetIds.push(target.id)
        }
      }
      
      // Emit event if in ExecutionContext
      if (this.executionContext && targetIds.length > 0) {
        await this.executionContext.emit(new FilterAppliedEvent(
          'canvas',
          'sharpen',
          { sharpen: sharpenValue },
          targetIds,
          this.executionContext.getMetadata()
        ))
      }
      
      this.currentSharpen = sharpenValue
    } finally {
      this.isApplying = false
    }
  }
  
  /**
   * Apply sharpen to a specific image object
   */
  private async applySharpenToImage(obj: CanvasObject, sharpenValue: number): Promise<void> {
    const imageNode = obj.node as Konva.Image
    
    // Cache the image for filter application
    imageNode.cache()
    
    // Set up enhance filter (similar to sharpen)
    const filters = imageNode.filters() || []
    
    if (sharpenValue > 0) {
      // Add or keep enhance filter
      if (!filters.includes(Konva.Filters.Enhance)) {
        filters.push(Konva.Filters.Enhance)
        imageNode.filters(filters)
      }
      
      // Apply enhance value (0 to 1 range)
      imageNode.enhance(sharpenValue / 100)
    } else {
      // Remove enhance filter
      const newFilters = filters.filter(f => f !== Konva.Filters.Enhance)
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
      console.warn('[SharpenTool] Pixel-based selections not yet implemented for sharpen')
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
   * Apply sharpen for AI operations with selection context
   */
  async applyWithContext(sharpenValue: number, targetObjects?: CanvasObject[]): Promise<void> {
    if (targetObjects) {
      // Apply to specific objects
      for (const obj of targetObjects) {
        if (obj.type === 'image') {
          await this.applySharpenToImage(obj, sharpenValue)
        }
      }
    } else {
      // Use normal apply
      await this.applySharpen(sharpenValue)
    }
  }
}

// Export singleton instance
export const sharpenTool = new SharpenTool() 