import { Sun } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseFilterTool } from '../filters/BaseFilterTool'
import { createToolState } from '../utils/toolState'
import type { Canvas } from 'fabric'

/**
 * Brightness Tool State
 */
type BrightnessState = {
  adjustment: number
  isAdjusting: boolean
}

/**
 * Brightness Tool - Adjust image brightness
 * Now supports selection-aware filtering
 */
class BrightnessTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.BRIGHTNESS
  name = 'Brightness'
  icon = Sun
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Tool state
  private state = createToolState<BrightnessState>({
    adjustment: 0,
    isAdjusting: false
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'brightness'
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
        await this.track('adjustBrightness', async () => {
          await this.applyBrightness(adjustment)
        })
      }
    })
    
    // Show selection indicator on tool activation
    this.showSelectionIndicator()
  }
  
  /**
   * Apply brightness adjustment
   */
  private async applyBrightness(adjustment: number): Promise<void> {
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
export const brightnessTool = new BrightnessTool() 