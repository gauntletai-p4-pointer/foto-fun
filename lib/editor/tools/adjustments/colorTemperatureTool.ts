import { Thermometer } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import { FilterAppliedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Color Temperature Tool - White balance adjustment
 * Konva implementation with Kelvin temperature to RGB conversion
 */
export class ColorTemperatureTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.COLOR_TEMPERATURE
  name = 'Color Temperature'
  icon = Thermometer
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Track current temperature (in Kelvin)
  private currentTemperature = 6500 // Default daylight
  private isAdjusting = false
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Check for existing temperature adjustments
    const selection = canvas.state.selection
    if (selection?.type === 'objects') {
      const firstObject = this.findObject(selection.objectIds[0])
      if (firstObject && firstObject.type === 'image') {
        const imageNode = firstObject.node as Konva.Image
        // Check if we have a custom temperature value stored
        const temperature = imageNode.getAttr('colorTemperature') || 6500
        this.currentTemperature = temperature
        this.setOption('temperature', temperature)
      }
    }
    
    // Set default temperature
    this.setOption('temperature', this.currentTemperature)
  }
  
  protected cleanupTool(): void {
    // Reset state but keep filters applied
    this.isAdjusting = false
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'temperature' && typeof value === 'number') {
      this.applyColorTemperature(value)
    }
  }
  
  /**
   * Apply color temperature adjustment
   */
  async applyColorTemperature(temperature: number): Promise<void> {
    if (this.isAdjusting) return
    
    this.isAdjusting = true
    
    try {
      const targets = this.getTargetObjects()
      
      if (targets.length === 0) {
        console.warn('[ColorTemperatureTool] No images to adjust')
        return
      }
      
      const targetIds: string[] = []
      
      for (const target of targets) {
        if (target.type === 'image') {
          await this.applyTemperatureToImage(target, temperature)
          targetIds.push(target.id)
        }
      }
      
      // Emit event if in ExecutionContext
      if (this.executionContext && targetIds.length > 0) {
        await this.executionContext.emit(new FilterAppliedEvent(
          'canvas',
          'colorTemperature',
          { temperature },
          targetIds,
          this.executionContext.getMetadata()
        ))
      }
      
      this.currentTemperature = temperature
    } finally {
      this.isAdjusting = false
    }
  }
  
  /**
   * Apply color temperature to a specific image object
   */
  private async applyTemperatureToImage(obj: CanvasObject, temperature: number): Promise<void> {
    const imageNode = obj.node as Konva.Image
    
    // Store temperature value as attribute
    imageNode.setAttr('colorTemperature', temperature)
    
    // Cache the image for filter application
    imageNode.cache()
    
    // Create custom temperature filter
    const filters = imageNode.filters() || []
    
    // Remove existing custom temperature filter if any
    const customFilters = filters.filter(f => f !== this.temperatureFilter)
    
    if (temperature !== 6500) { // 6500K is neutral daylight
      // Add custom temperature filter
      customFilters.push(this.temperatureFilter)
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
   * Convert Kelvin temperature to RGB multipliers
   * Based on Tanner Helland's algorithm
   */
  private kelvinToRGB(kelvin: number): { r: number; g: number; b: number } {
    const temp = kelvin / 100
    let r: number, g: number, b: number
    
    // Red
    if (temp <= 66) {
      r = 255
    } else {
      r = temp - 60
      r = 329.698727446 * Math.pow(r, -0.1332047592)
      r = Math.max(0, Math.min(255, r))
    }
    
    // Green
    if (temp <= 66) {
      g = temp
      g = 99.4708025861 * Math.log(g) - 161.1195681661
      g = Math.max(0, Math.min(255, g))
    } else {
      g = temp - 60
      g = 288.1221695283 * Math.pow(g, -0.0755148492)
      g = Math.max(0, Math.min(255, g))
    }
    
    // Blue
    if (temp >= 66) {
      b = 255
    } else if (temp <= 19) {
      b = 0
    } else {
      b = temp - 10
      b = 138.5177312231 * Math.log(b) - 305.0447927307
      b = Math.max(0, Math.min(255, b))
    }
    
    // Return as multipliers (0-1 range)
    return {
      r: r / 255,
      g: g / 255,
      b: b / 255
    }
  }
  
  /**
   * Custom temperature filter function
   */
  private temperatureFilter = (imageData: ImageData) => {
    const data = imageData.data
    const nPixels = data.length
    
    // Get temperature value from the current context
    const temperature = this.currentTemperature
    
    // Get RGB multipliers for the temperature
    const targetRGB = this.kelvinToRGB(temperature)
    const neutralRGB = this.kelvinToRGB(6500) // Neutral daylight
    
    // Calculate relative multipliers
    const rMultiplier = targetRGB.r / neutralRGB.r
    const gMultiplier = targetRGB.g / neutralRGB.g
    const bMultiplier = targetRGB.b / neutralRGB.b
    
    for (let i = 0; i < nPixels; i += 4) {
      // Apply temperature shift to RGB channels
      data[i] = Math.min(255, Math.max(0, data[i] * rMultiplier))     // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * gMultiplier)) // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * bMultiplier)) // B
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
      console.warn('[ColorTemperatureTool] Pixel-based selections not yet implemented')
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
   * Apply color temperature for AI operations with selection context
   */
  async applyWithContext(temperature: number, targetObjects?: CanvasObject[]): Promise<void> {
    if (targetObjects) {
      // Apply to specific objects
      for (const obj of targetObjects) {
        if (obj.type === 'image') {
          await this.applyTemperatureToImage(obj, temperature)
        }
      }
    } else {
      // Use normal apply
      await this.applyColorTemperature(temperature)
    }
  }
}

// Export singleton instance
export const colorTemperatureTool = new ColorTemperatureTool() 