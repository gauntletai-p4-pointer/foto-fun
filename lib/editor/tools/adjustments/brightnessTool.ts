import { Sun } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { ObjectWebGLFilterTool } from '../base/ObjectWebGLFilterTool'

/**
 * Object-based Brightness Tool
 * Adjusts brightness of selected objects using WebGL
 */
export class BrightnessTool extends ObjectWebGLFilterTool {
  // Tool identification
  id = TOOL_IDS.BRIGHTNESS
  name = 'Brightness'
  icon = Sun
  cursor = 'default'
  shortcut = undefined // Accessed via adjustments panel
  
  // Filter configuration
  protected getFilterType(): string {
    return 'brightness'
  }
  
  protected getDefaultParams(): Record<string, number> {
    return {
      amount: 0 // Range: -1 to 1 (-100% to +100%)
    }
  }
  
  // Tool options configuration
  static options = [
    {
      id: 'amount',
      type: 'slider' as const,
      label: 'Brightness',
      min: -100,
      max: 100,
      default: 0,
      step: 1,
      suffix: '%'
    }
  ]
  
  /**
   * Convert UI value to WebGL parameter
   */
  protected getAllOptions(): Record<string, number> {
    const amount = (this.getOption('amount') as number) || 0
    return {
      amount: amount / 100 // Convert percentage to -1 to 1 range
    }
  }
  
  /**
   * Public method for programmatic brightness adjustment
   */
  async applyBrightness(adjustment: number): Promise<void> {
    this.setOption('amount', adjustment)
    await this.applyImmediate()
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