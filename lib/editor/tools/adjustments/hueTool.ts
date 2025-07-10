/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Paintbrush } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseFilterTool } from '../filters/BaseFilterTool'
import { createToolState } from '../utils/toolState'
import type { Canvas } from 'fabric'

/**
 * Hue Tool State
 */
type HueState = {
  rotation: number
  isAdjusting: boolean
}

/**
 * Hue Tool - Rotate image colors on the color wheel
 * Now supports selection-aware filtering
 */
class HueTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.HUE
  name = 'Hue'
  icon = Paintbrush
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Tool state
  private state = createToolState<HueState>({
    rotation: 0,
    isAdjusting: false
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'hue'
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return { rotation: this.state.get('rotation') }
  }
  
  /**
   * Tool setup
   */
  protected setupFilterTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(async (options) => {
      const rotation = options.find(opt => opt.id === 'hue')?.value
      if (rotation !== undefined && typeof rotation === 'number') {
        await this.track('adjustHue', async () => {
          await this.applyHue(rotation)
        })
      }
    })
    
    // Apply initial value if any
    const currentRotation = this.toolOptionsStore.getOptionValue<number>(this.id, 'hue')
    if (currentRotation !== undefined && currentRotation !== 0) {
      this.applyHue(currentRotation)
    }
    
    // Show selection indicator on tool activation
    this.showSelectionIndicator()
  }
  
  /**
   * Apply hue adjustment
   */
  private async applyHue(adjustment: number): Promise<void> {
    if (this.state.get('isAdjusting')) return
    
    this.state.set('isAdjusting', true)
    this.state.set('rotation', adjustment)
    
    try {
      // Use the base class applyFilter method
      await this.applyFilter({ rotation: adjustment })
    } finally {
      this.state.set('isAdjusting', false)
    }
  }
  
  /**
   * Tool cleanup
   */
  protected cleanupFilterTool(): void {
    // Don't reset the hue value - let it persist
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
export const hueTool = new HueTool() 