import { Contrast } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { ObjectWebGLFilterTool } from '../base/ObjectWebGLFilterTool'

/**
 * Object-based Invert Tool
 * Inverts colors of selected objects using WebGL
 */
export class InvertTool extends ObjectWebGLFilterTool {
  // Tool identification
  id = TOOL_IDS.INVERT
  name = 'Invert'
  icon = Contrast
  cursor = 'default'
  shortcut = undefined // Accessed via filters panel
  
  // Filter configuration
  protected getFilterType(): string {
    return 'invert'
  }
  
  protected getDefaultParams(): Record<string, number> {
    return {
      amount: 1 // 0 = no effect, 1 = full invert
    }
  }
  
  // Tool options configuration
  static options = [
    {
      id: 'amount',
      type: 'slider' as const,
      label: 'Amount',
      min: 0,
      max: 100,
      default: 100,
      step: 1,
      suffix: '%'
    }
  ]
  
  /**
   * Convert UI value to WebGL parameter
   */
  protected getAllOptions(): Record<string, number> {
    const amount = (this.getOption('amount') as number) || 100
    return {
      amount: amount / 100 // Convert percentage to 0-1 range
    }
  }
  
  /**
   * Public method for programmatic invert application
   */
  async applyInvert(amount: number = 100): Promise<void> {
    this.setOption('amount', amount)
    await this.applyImmediate()
  }
  
  /**
   * Toggle invert on/off
   */
  async toggleInvert(): Promise<void> {
    const currentAmount = (this.getOption('amount') as number) || 0
    if (currentAmount > 0) {
      this.setOption('amount', 0)
    } else {
      this.setOption('amount', 100)
    }
    await this.applyImmediate()
  }
}

// Export singleton instance
export const invertTool = new InvertTool() 