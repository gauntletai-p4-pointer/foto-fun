import { Contrast } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseFilterTool } from '../filters/BaseFilterTool'
import { createToolState } from '../utils/toolState'
import type { Canvas } from 'fabric'

/**
 * Contrast Tool State
 */
type ContrastState = {
  adjustment: number
  isAdjusting: boolean
}

/**
 * Contrast Tool - Adjust image contrast
 * Now supports selection-aware filtering
 */
class ContrastTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.CONTRAST
  name = 'Contrast'
  icon = Contrast
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Tool state
  private state = createToolState<ContrastState>({
    adjustment: 0,
    isAdjusting: false
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'contrast'
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return { adjustment: this.state.get('adjustment') }
  }
  
  /**
   * Tool setup
   */
  protected setupFilterTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(async (options) => {
      const adjustment = options.find(opt => opt.id === 'adjustment')?.value
      if (adjustment !== undefined && typeof adjustment === 'number') {
        await this.track('adjustContrast', async () => {
          await this.applyContrast(adjustment)
        })
      }
    })
    
    // Apply initial value if any
    const currentAdjustment = this.toolOptionsStore.getOptionValue<number>(this.id, 'adjustment')
    if (currentAdjustment !== undefined && currentAdjustment !== 0) {
      this.applyContrast(currentAdjustment)
    }
    
    // Show selection indicator on tool activation
    this.showSelectionIndicator()
  }
  
  /**
   * Apply contrast adjustment
   */
  private async applyContrast(adjustment: number): Promise<void> {
    if (this.state.get('isAdjusting')) return
    
    this.state.set('isAdjusting', true)
    this.state.set('adjustment', adjustment)
    
    try {
      // Use the base class applyFilter method
      await this.applyFilter({ adjustment })
    } finally {
      this.state.set('isAdjusting', false)
    }
  }
  
  /**
   * Tool cleanup
   */
  protected cleanupFilterTool(): void {
    // Don't reset the adjustment value - let it persist
    // Reset only the internal state
    this.state.setState({
      isAdjusting: false
    })
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
}

// Export singleton instance
export const contrastTool = new ContrastTool() 