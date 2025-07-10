import { Sun } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import type { Image as FabricImage } from 'fabric'
import { filters } from 'fabric'

// Define filter type
interface ImageFilter {
  type?: string
  [key: string]: unknown
}

/**
 * Brightness Tool State
 */
type BrightnessState = {
  adjustment: number
  isAdjusting: boolean
  previousFilters: Map<string, ImageFilter[]>
}

/**
 * Brightness Tool - Adjust image brightness
 * Uses Fabric.js brightness filter
 */
class BrightnessTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.BRIGHTNESS
  name = 'Brightness'
  icon = Sun
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Tool state
  private state = createToolState<BrightnessState>({
    adjustment: 0,
    isAdjusting: false,
    previousFilters: new Map()
  })
  
  /**
   * Tool setup
   */
  protected setupTool(): void {
    // Check if there's already a brightness filter applied and sync the UI
    if (this.canvas) {
      const objects = this.canvas.getObjects()
      const images = objects.filter(obj => obj.type === 'image') as FabricImage[]
      
      if (images.length > 0) {
        // Check the first image for existing brightness filter
        const firstImage = images[0]
        if (firstImage.filters) {
          const brightnessFilter = firstImage.filters.find(
            (f) => (f as unknown as ImageFilter).type === 'Brightness'
          ) as unknown as { brightness?: number }
          
          if (brightnessFilter && brightnessFilter.brightness !== undefined) {
            // Convert back from -1 to 1 range to -100 to 100
            const currentValue = Math.round(brightnessFilter.brightness * 100)
            // Update the UI to reflect the current state
            this.toolOptionsStore.updateOption(this.id, 'adjustment', currentValue)
          }
        }
      }
    }
    
    // Subscribe to tool options
    this.subscribeToToolOptions((options) => {
      const adjustment = options.find(opt => opt.id === 'adjustment')?.value
      if (adjustment !== undefined && typeof adjustment === 'number') {
        this.track('adjustBrightness', () => {
          this.applyBrightness(adjustment)
        })
      }
    })
  }
  
  /**
   * Apply brightness adjustment to all images on canvas
   */
  private applyBrightness(brightness: number): void {
    if (!this.canvas || this.state.get('isAdjusting')) {
      console.error('[BrightnessTool] No canvas available or already applying!')
      return
    }
    
    this.executeWithGuard('isAdjusting', async () => {
      // Use getTargetImages which respects selection snapshot
      const images = this.getTargetImages()
      
      if (images.length === 0) {
        console.warn('[BrightnessTool] No images found to adjust brightness')
        return
      }
      
      console.log(`[BrightnessTool] Applying brightness ${brightness} to ${images.length} images`)
      
      // Apply brightness filter to images
      await this.applyImageFilters(
        images,
        'Brightness',
        () => new filters.Brightness({ brightness: brightness / 100 }),
        `Adjust brightness to ${brightness}%`
      )
    })
  }
  
  /**
   * Tool cleanup
   */
  protected cleanup(): void {
    // Don't reset the adjustment value - let it persist
    // The user can manually reset or use undo if they want to remove the effect
    
    // Clear stored filters (but don't remove applied filters)
    this.state.get('previousFilters').clear()
    
    // Reset only the internal state, not the actual adjustment
    this.state.setState({
      isAdjusting: false,
      previousFilters: new Map()
    })
  }
}

// Export singleton instance
export const brightnessTool = new BrightnessTool() 