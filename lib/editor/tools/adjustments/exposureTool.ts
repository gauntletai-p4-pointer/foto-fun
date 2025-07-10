import { Aperture } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import { FilterAppliedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Exposure Tool - Adjust image exposure compensation
 * Konva implementation with custom filter for HDR-like adjustments
 */
export class ExposureTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.EXPOSURE
  name = 'Exposure'
  icon = Aperture
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Track current exposure
  private currentExposure = 0
  private isAdjusting = false
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Check for existing exposure adjustments
    const selection = canvas.state.selection
    if (selection?.type === 'objects') {
      const firstObject = this.findObject(selection.objectIds[0])
      if (firstObject && firstObject.type === 'image') {
        const imageNode = firstObject.node as Konva.Image
        // Check if we have a custom exposure value stored
        const exposure = imageNode.getAttr('exposure') || 0
        this.currentExposure = exposure
        this.setOption('exposure', exposure)
      }
    }
    
    // Set default exposure
    this.setOption('exposure', this.currentExposure)
  }
  
  protected cleanupTool(): void {
    // Reset state but keep filters applied
    this.isAdjusting = false
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'exposure' && typeof value === 'number') {
      this.applyExposure(value)
    }
  }
  
  /**
   * Apply exposure adjustment
   */
  async applyExposure(exposureValue: number): Promise<void> {
    if (this.isAdjusting) return
    
    this.isAdjusting = true
    
    try {
      const targets = this.getTargetObjects()
      
      if (targets.length === 0) {
        console.warn('[ExposureTool] No images to adjust')
        return
      }
      
      const targetIds: string[] = []
      
      for (const target of targets) {
        if (target.type === 'image') {
          await this.applyExposureToImage(target, exposureValue)
          targetIds.push(target.id)
        }
      }
      
      // Emit event if in ExecutionContext
      if (this.executionContext && targetIds.length > 0) {
        await this.executionContext.emit(new FilterAppliedEvent(
          'canvas',
          'exposure',
          { exposure: exposureValue },
          targetIds,
          this.executionContext.getMetadata()
        ))
      }
      
      this.currentExposure = exposureValue
    } finally {
      this.isAdjusting = false
    }
  }
  
  /**
   * Apply exposure to a specific image object
   */
  private async applyExposureToImage(obj: CanvasObject, exposureValue: number): Promise<void> {
    const imageNode = obj.node as Konva.Image
    
    // Store exposure value as attribute
    imageNode.setAttr('exposure', exposureValue)
    
    // Cache the image for filter application
    imageNode.cache()
    
    // Create custom exposure filter
    const filters = imageNode.filters() || []
    
    // Remove existing custom exposure filter if any
    const customFilters = filters.filter(f => f !== this.exposureFilter)
    
    if (exposureValue !== 0) {
      // Add custom exposure filter
      customFilters.push(this.exposureFilter)
    }
    
    imageNode.filters(customFilters)
    
    // Clear cache if no filters remain
    if (customFilters.length === 0) {
      imageNode.clearCache()
    }
    
    // Redraw
    const layer = this.findLayerForObject(obj)
    if (layer) {
      layer.konvaLayer.batchDraw()
    }
  }
  
  /**
   * Custom exposure filter function
   */
  private exposureFilter = (imageData: ImageData) => {
    const data = imageData.data
    const nPixels = data.length
    
    // Get exposure value from the current node context
    // This is a bit hacky but Konva doesn't provide a better way
    const exposureValue = this.currentExposure
    
    // Convert exposure stops to multiplier
    // Each stop doubles or halves the light
    const multiplier = Math.pow(2, exposureValue)
    
    for (let i = 0; i < nPixels; i += 4) {
      // Apply exposure compensation to RGB channels
      data[i] = Math.min(255, Math.max(0, data[i] * multiplier))     // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * multiplier)) // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * multiplier)) // B
      // Alpha channel unchanged
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
      console.warn('[ExposureTool] Pixel-based selections not yet implemented')
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
   * Apply exposure for AI operations with selection context
   */
  async applyWithContext(exposureValue: number, targetObjects?: CanvasObject[]): Promise<void> {
    if (targetObjects) {
      // Apply to specific objects
      for (const obj of targetObjects) {
        if (obj.type === 'image') {
          await this.applyExposureToImage(obj, exposureValue)
        }
      }
    } else {
      // Use normal apply
      await this.applyExposure(exposureValue)
    }
  }
}

// Export singleton instance
export const exposureTool = new ExposureTool() 