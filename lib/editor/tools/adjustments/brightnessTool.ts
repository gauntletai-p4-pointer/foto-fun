import { Sun } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { WebGLFilterTool } from '../base/WebGLFilterTool'

/**
 * Brightness Tool - Adjust image brightness
 * WebGL implementation for high-performance brightness adjustment
 */
export class BrightnessTool extends WebGLFilterTool {
  // Tool identification
  id = TOOL_IDS.BRIGHTNESS
  name = 'Brightness'
  icon = Sun
  cursor = 'default'
  shortcut = 'B'
  
  protected getFilterType(): string {
    return 'brightness'
  }
  
  protected getDefaultParams(): Record<string, any> {
    return {
      adjustment: 0 // -100 to 100 percentage
    }
  }
  
  /**
   * Convert UI percentage to WebGL range
   * UI uses -100 to 100, WebGL uses -1 to 1
   */
  protected convertOptionsToWebGLParams(options: Record<string, unknown>): Record<string, any> {
    const adjustment = (options.adjustment as number) || 0
    return {
      amount: adjustment / 100
    }
  }
  
  /**
   * Public method for programmatic brightness adjustment
   */
  async applyBrightness(adjustment: number): Promise<void> {
    this.setOption('adjustment', adjustment)
    await this.applyFilter()
  }
  
  /**
   * Toggle between original and brightened
   */
  async toggleBrightness(): Promise<void> {
    const currentAdjustment = this.getOption('adjustment') as number
    
    if (currentAdjustment !== 0) {
      // Reset to original
      this.setOption('adjustment', 0)
      await this.removeFilter()
    } else {
      // Apply last used value or default
      const lastValue = this.lastAppliedParams?.amount
        ? this.lastAppliedParams.amount * 100
        : 20
      this.setOption('adjustment', lastValue)
      await this.applyFilter()
    }
  }
  
  /**
   * Get brightness range for UI
   */
  getBrightnessRange(): { min: number; max: number; step: number } {
    return {
      min: -100,
      max: 100,
      step: 1
    }
  }
}

// Export singleton instance
export const brightnessTool = new BrightnessTool() 