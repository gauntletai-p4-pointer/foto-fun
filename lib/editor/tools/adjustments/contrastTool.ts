import { Contrast } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { filters } from 'fabric'

// Define filter type
interface ImageFilter {
  type?: string
  [key: string]: unknown
}

/**
 * Contrast Tool State
 */
type ContrastState = {
  adjustment: number
  isAdjusting: boolean
  previousFilters: Map<string, ImageFilter[]>
}

/**
 * Contrast Tool - Adjust image contrast
 * Uses Fabric.js contrast filter
 */
class ContrastTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.CONTRAST
  name = 'Contrast'
  icon = Contrast
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Tool state
  private state = createToolState<ContrastState>({
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
        this.track('adjustContrast', () => {
          this.applyContrast(adjustment)
        })
      }
    })
    
    // Apply initial value if any
    const currentAdjustment = this.toolOptionsStore.getOptionValue<number>(this.id, 'adjustment')
    if (currentAdjustment !== undefined && currentAdjustment !== 0) {
      this.applyContrast(currentAdjustment)
    }
  }
  
  /**
   * Apply contrast adjustment to all images on canvas
   */
  private applyContrast(contrast: number): void {
    if (!this.canvas || this.state.get('isAdjusting')) {
      console.error('[ContrastTool] No canvas available or already applying!')
      return
    }
    
    this.executeWithGuard('isAdjusting', async () => {
      // Use getTargetImages which respects selection snapshot
      const images = this.getTargetImages()
      
      if (images.length === 0) {
        console.warn('[ContrastTool] No images found to adjust contrast')
        return
      }
      
      console.log(`[ContrastTool] Applying contrast ${contrast} to ${images.length} images`)
      
      // Apply contrast filter to images
      await this.applyImageFilters(
        images,
        'Contrast',
        () => new filters.Contrast({ contrast: contrast / 100 }),
        `Adjust contrast to ${contrast}%`
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
export const contrastTool = new ContrastTool() 