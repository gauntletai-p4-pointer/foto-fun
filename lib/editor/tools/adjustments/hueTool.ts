import { Palette } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import { FilterAppliedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Hue Tool - Rotate image colors on the color wheel
 * Konva implementation with HSL filter
 */
export class HueTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.HUE
  name = 'Hue'
  icon = Palette
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Track current rotation
  private currentRotation = 0
  private isAdjusting = false
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Check for existing hue adjustments
    const selection = canvas.state.selection
    if (selection?.type === 'objects') {
      const firstObject = this.findObject(selection.objectIds[0])
      if (firstObject && firstObject.type === 'image') {
        const imageNode = firstObject.node as Konva.Image
        const filters = imageNode.filters() || []
        if (filters.includes(Konva.Filters.HSL)) {
          // Get current hue value
          const hue = imageNode.hue() || 0
          this.currentRotation = hue
          this.setOption('hue', hue)
        }
      }
    }
    
    // Set default rotation
    this.setOption('hue', this.currentRotation)
  }
  
  protected cleanupTool(): void {
    // Reset state but keep filters applied
    this.isAdjusting = false
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'hue' && typeof value === 'number') {
      this.applyHue(value)
    }
  }
  
  /**
   * Apply hue rotation
   */
  async applyHue(rotation: number): Promise<void> {
    if (this.isAdjusting) return
    
    this.isAdjusting = true
    
    try {
      const targets = this.getTargetObjects()
      
      if (targets.length === 0) {
        console.warn('[HueTool] No images to adjust')
        return
      }
      
      const targetIds: string[] = []
      
      for (const target of targets) {
        if (target.type === 'image') {
          await this.applyHueToImage(target, rotation)
          targetIds.push(target.id)
        }
      }
      
      // Emit event if in ExecutionContext
      if (this.executionContext && targetIds.length > 0) {
        await this.executionContext.emit(new FilterAppliedEvent(
          'canvas',
          'hue',
          { hue: rotation },
          targetIds,
          this.executionContext.getMetadata()
        ))
      }
      
      this.currentRotation = rotation
    } finally {
      this.isAdjusting = false
    }
  }
  
  /**
   * Apply hue to a specific image object
   */
  private async applyHueToImage(obj: CanvasObject, rotation: number): Promise<void> {
    const imageNode = obj.node as Konva.Image
    
    // Cache the image for filter application
    imageNode.cache()
    
    // Set up HSL filter
    const filters = imageNode.filters() || []
    if (!filters.includes(Konva.Filters.HSL)) {
      filters.push(Konva.Filters.HSL)
      imageNode.filters(filters)
    }
    
    // Apply hue rotation (Konva expects degrees 0-360)
    // Normalize the rotation to 0-360 range
    const normalizedRotation = ((rotation % 360) + 360) % 360
    imageNode.hue(normalizedRotation)
    
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
      console.warn('[HueTool] Pixel-based selections not yet implemented')
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
   * Apply hue for AI operations with selection context
   */
  async applyWithContext(rotation: number, targetObjects?: CanvasObject[]): Promise<void> {
    if (targetObjects) {
      // Apply to specific objects
      for (const obj of targetObjects) {
        if (obj.type === 'image') {
          await this.applyHueToImage(obj, rotation)
        }
      }
    } else {
      // Use normal apply
      await this.applyHue(rotation)
    }
  }
}

// Export singleton instance
export const hueTool = new HueTool() 