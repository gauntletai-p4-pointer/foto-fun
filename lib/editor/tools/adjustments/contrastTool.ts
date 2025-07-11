import { Contrast } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { ObjectWebGLFilterTool } from '../base/ObjectWebGLFilterTool'

/**
 * Object-based Contrast Tool
 * Adjusts contrast of selected objects using WebGL
 */
export class ContrastTool extends ObjectWebGLFilterTool {
  // Tool identification
  id = TOOL_IDS.CONTRAST
  name = 'Contrast'
  icon = Contrast
  cursor = 'default'
  shortcut = undefined // Accessed via adjustments panel
  
  // Filter configuration
  protected getFilterType(): string {
    return 'contrast'
  }
  
  protected getDefaultParams(): Record<string, any> {
    return {
      amount: 0 // Range: -1 to 1 (-100% to +100%)
    }
  }
  
  // Tool options configuration
  static options = [
    {
      id: 'amount',
      type: 'slider' as const,
      label: 'Contrast',
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
  protected getAllOptions(): Record<string, any> {
    const amount = (this.getOption('amount') as number) || 0
    return {
      amount: amount / 100 // Convert percentage to -1 to 1 range
    }
  }
  
  /**
   * Public method for programmatic contrast adjustment
   */
  async applyContrast(adjustment: number): Promise<void> {
    this.setOption('amount', adjustment)
    await this.applyImmediate()
  }
  
  /**
   * Get contrast range for UI
   */
  getContrastRange(): { min: number; max: number; step: number } {
    return {
      min: -100,
      max: 100,
      step: 1
    }
  }
}

// Export singleton instance
export const contrastTool = new ContrastTool() 