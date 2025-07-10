import { Palette } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
// import type { FabricObject, Image as FabricImage } from 'fabric'
import { filters } from 'fabric'
// import { ModifyCommand } from '@/lib/editor/commands/canvas'

// Define filter type
interface ImageFilter {
  type?: string
  [key: string]: unknown
}

/**
 * Saturation Tool State
 */
type SaturationState = {
  adjustment: number
  isAdjusting: boolean
  previousFilters: Map<string, ImageFilter[]>
}

/**
 * Saturation Tool - Adjust image color saturation
 * Uses Fabric.js saturation filter
 */
class SaturationTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.SATURATION
  name = 'Saturation'
  icon = Palette
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Tool state
  private state = createToolState<SaturationState>({
    adjustment: 0,
    isAdjusting: false,
    previousFilters: new Map()
  })
  
  /**
   * Tool setup
   */
  protected setupTool(): void {
    // Subscribe to tool options
    this.subscribeToToolOptions((options) => {
      const adjustment = options.find(opt => opt.id === 'adjustment')?.value
      if (adjustment !== undefined && typeof adjustment === 'number') {
        this.track('adjustSaturation', () => {
          this.applySaturation(adjustment)
        })
      }
    })
    
    // Apply initial value if any
    const currentAdjustment = this.toolOptionsStore.getOptionValue<number>(this.id, 'adjustment')
    if (currentAdjustment !== undefined && currentAdjustment !== 0) {
      this.applySaturation(currentAdjustment)
    }
  }
  
  /**
   * Apply saturation adjustment to all images on canvas
   */
  private applySaturation(adjustment: number): void {
    if (!this.canvas) return
    
    this.state.set('adjustment', adjustment)
    
    // Get target images using selection-aware method
    const images = this.getTargetImages()
    
    if (images.length === 0) {
      console.warn('No images found to adjust saturation')
      return
    }
    
    // Use the base class filter management
    this.executeWithGuard('isAdjusting', async () => {
      await this.applyImageFilters(
        images,
        'Saturation',
        () => {
          if (adjustment !== 0) {
            // Fabric.js saturation value is between -1 and 1
            const saturationValue = adjustment / 100
            return new filters.Saturation({
              saturation: saturationValue
            })
          }
          return null
        },
        `Adjust saturation to ${adjustment}%`
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
export const saturationTool = new SaturationTool() 