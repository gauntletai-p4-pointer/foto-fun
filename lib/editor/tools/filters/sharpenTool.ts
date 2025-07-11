import { Focus } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { ObjectWebGLFilterTool } from '../base/ObjectWebGLFilterTool'

/**
 * Object-based Sharpen Tool
 * Applies unsharp mask filter to selected objects using WebGL
 */
export class SharpenTool extends ObjectWebGLFilterTool {
  // Tool identification
  id = TOOL_IDS.SHARPEN
  name = 'Sharpen'
  icon = Focus
  cursor = 'default'
  shortcut = undefined // Accessed via filters panel
  
  // Filter configuration
  protected getFilterType(): string {
    return 'sharpen'
  }
  
  protected getDefaultParams(): Record<string, number> {
    return {
      amount: 0, // Range: 0 to 2 (0 = no effect, 1 = normal, 2 = strong)
      radius: 1  // Radius of the unsharp mask
    }
  }
  
  // Tool options configuration
  static options = [
    {
      id: 'amount',
      type: 'slider' as const,
      label: 'Amount',
      min: 0,
      max: 200,
      default: 0,
      step: 1,
      suffix: '%'
    },
    {
      id: 'radius',
      type: 'slider' as const,
      label: 'Radius',
      min: 0.5,
      max: 5,
      default: 1,
      step: 0.1,
      suffix: 'px'
    }
  ]
  
  /**
   * Convert UI value to WebGL parameter
   */
  protected getAllOptions(): Record<string, number> {
    const amount = (this.getOption('amount') as number) || 0
    const radius = (this.getOption('radius') as number) || 1
    return {
      amount: amount / 100, // Convert percentage to 0-2 range
      radius
    }
  }
  
  /**
   * Public method for programmatic sharpen application
   */
  async applySharpen(amount: number, radius: number = 1): Promise<void> {
    this.setOption('amount', amount)
    this.setOption('radius', radius)
    await this.applyImmediate()
  }
  
  /**
   * Get sharpen range for UI
   */
  getSharpenRange(): { min: number; max: number; step: number } {
    return {
      min: 0,
      max: 200,
      step: 1
    }
  }
}

// Export singleton instance
export const sharpenTool = new SharpenTool() 