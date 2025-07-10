import { Palette } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import * as fabric from 'fabric'
import type { Canvas } from 'fabric'

// Define filter type
interface ImageFilter {
  type?: string
  [key: string]: unknown
}

/**
 * Hue Tool State
 */
type HueState = {
  rotation: number
  isAdjusting: boolean
  previousFilters: Map<string, ImageFilter[]>
}

/**
 * Hue Tool - Rotate image colors on the color wheel
 * Uses Fabric.js HueRotation filter
 */
class HueTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.HUE
  name = 'Hue'
  icon = Palette
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Tool state
  private state = createToolState<HueState>({
    rotation: 0,
    isAdjusting: false,
    previousFilters: new Map()
  })
  
  /**
   * Tool setup
   */
  protected setupTool(): void {
    // Subscribe to tool options
    this.subscribeToToolOptions((options) => {
      const rotation = options.find(opt => opt.id === 'hue')?.value
      if (rotation !== undefined && typeof rotation === 'number') {
        this.track('adjustHue', () => {
          this.applyHue(rotation)
        })
      }
    })
    
    // Apply initial value if any
    const currentRotation = this.toolOptionsStore.getOptionValue<number>(this.id, 'hue')
    if (currentRotation !== undefined && currentRotation !== 0) {
      this.applyHue(currentRotation)
    }
  }
  
  /**
   * Apply hue rotation to all images on canvas
   */
  private applyHue(rotation: number): void {
    if (!this.canvas) return
    
    this.state.set('rotation', rotation)
    
    // Get target images using selection-aware method
    const images = this.getTargetImages()
    
    if (images.length === 0) {
      console.warn('No images found to adjust hue')
      return
    }
    
    // Use the base class filter management
    this.executeWithGuard('isAdjusting', async () => {
      await this.applyImageFilters(
        images,
        'HueRotation',
        () => {
          if (rotation !== 0) {
            // Fabric.js HueRotation expects rotation in radians (0 to 2π)
            // Convert degrees to radians
            const rotationRadians = (rotation * Math.PI) / 180
            return new fabric.filters.HueRotation({
              rotation: rotationRadians
            })
          }
          return null
        },
        `Rotate hue by ${rotation}°`
      )
    })
  }
  
  /**
   * Tool cleanup
   */
  protected cleanup(): void {
    // Don't reset the hue value - let it persist
    // The user can manually reset or use undo if they want to remove the effect
    
    // Clear stored filters (but don't remove applied filters)
    this.state.get('previousFilters').clear()
    
    // Reset only the internal state, not the actual hue
    this.state.setState({
      isAdjusting: false,
      previousFilters: new Map()
    })
  }
  
  /**
   * Required: Activation
   */
  onActivate(canvas: Canvas): void {
    // Call parent implementation which sets up the tool
    super.onActivate(canvas)
  }
}

// Export singleton instance
export const hueTool = new HueTool() 