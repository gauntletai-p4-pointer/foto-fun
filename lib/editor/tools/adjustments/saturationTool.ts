import { Droplet } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { ObjectWebGLFilterTool } from '../base/ObjectWebGLFilterTool'

/**
 * Saturation adjustment value interface
 */
interface SaturationOptions extends Record<string, number> {
  amount: number
}

/**
 * Object-based Saturation Tool
 * Adjusts color saturation of selected objects using WebGL
 */
export class SaturationTool extends ObjectWebGLFilterTool {
  // Tool identification
  id = TOOL_IDS.SATURATION
  name = 'Saturation'
  icon = Droplet
  cursor = 'default'
  shortcut = undefined // Accessed via adjustments panel
  
  // Filter configuration
  protected getFilterType(): string {
    return 'saturation'
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
      label: 'Saturation',
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
    } satisfies SaturationOptions
  }
  
  /**
   * Public method for programmatic saturation adjustment
   */
  async applySaturation(adjustment: number): Promise<void> {
    this.setOption('amount', adjustment)
    await this.applyImmediate()
  }
  
  /**
   * Get saturation range for UI
   */
  getSaturationRange(): { min: number; max: number; step: number } {
    return {
      min: -100,
      max: 100,
      step: 1
    }
  }
}

// Export singleton instance
export const saturationTool = new SaturationTool() 