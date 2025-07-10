import { Camera } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import { FilterAppliedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Sepia Tool - Apply sepia tone effect to images
 * Konva implementation with RGB matrix transformation
 */
export class SepiaTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.SEPIA
  name = 'Sepia'
  icon = Camera
  cursor = 'default'
  shortcut = 'P'
  
  // Track current intensity
  private currentIntensity = 0
  private isApplying = false
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Check for existing sepia on selected objects
    const selection = canvas.state.selection
    if (selection?.type === 'objects') {
      const firstObject = this.findObject(selection.objectIds[0])
      if (firstObject && firstObject.type === 'image') {
        const imageNode = firstObject.node as Konva.Image
        const filters = imageNode.filters() || []
        if (filters.includes(Konva.Filters.Sepia)) {
          // Sepia is typically on/off, but we'll track intensity
          this.currentIntensity = 100
          this.setOption('intensity', this.currentIntensity)
        }
      }
    }
    
    // Set default intensity
    this.setOption('intensity', this.currentIntensity)
  }
  
  protected cleanupTool(): void {
    // Reset state but keep filters applied
    this.isApplying = false
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'intensity' && typeof value === 'number') {
      this.applySepia(value)
    }
  }
  
  /**
   * Apply sepia filter
   */
  async applySepia(intensity: number): Promise<void> {
    if (this.isApplying) return
    
    this.isApplying = true
    
    try {
      const targets = this.getTargetObjects()
      
      if (targets.length === 0) {
        console.warn('[SepiaTool] No images to apply sepia')
        return
      }
      
      const targetIds: string[] = []
      
      for (const target of targets) {
        if (target.type === 'image') {
          await this.applySepiaToImage(target, intensity)
          targetIds.push(target.id)
        }
      }
      
      // Emit event if in ExecutionContext
      if (this.executionContext && targetIds.length > 0) {
        await this.executionContext.emit(new FilterAppliedEvent(
          'canvas',
          'sepia',
          { intensity },
          targetIds,
          this.executionContext.getMetadata()
        ))
      }
      
      this.currentIntensity = intensity
    } finally {
      this.isApplying = false
    }
  }
  
  /**
   * Apply sepia to a specific image object
   */
  private async applySepiaToImage(obj: CanvasObject, intensity: number): Promise<void> {
    const imageNode = obj.node as Konva.Image
    
    // Cache the image for filter application
    imageNode.cache()
    
    // Set up sepia filter
    const filters = imageNode.filters() || []
    
    if (intensity > 0) {
      // Add or keep sepia filter
      if (!filters.includes(Konva.Filters.Sepia)) {
        filters.push(Konva.Filters.Sepia)
        imageNode.filters(filters)
      }
      
      // Note: Konva's sepia filter doesn't have intensity control
      // It's either on or off. For partial sepia, we'd need custom filter
    } else {
      // Remove sepia filter
      const newFilters = filters.filter(f => f !== Konva.Filters.Sepia)
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
      console.warn('[SepiaTool] Pixel-based selections not yet implemented')
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
   * Apply sepia for AI operations with selection context
   */
  async applyWithContext(intensity: number, targetObjects?: CanvasObject[]): Promise<void> {
    if (targetObjects) {
      // Apply to specific objects
      for (const obj of targetObjects) {
        if (obj.type === 'image') {
          await this.applySepiaToImage(obj, intensity)
        }
      }
    } else {
      // Use normal apply
      await this.applySepia(intensity)
    }
  }
}

// Export singleton instance
export const sepiaTool = new SepiaTool() 