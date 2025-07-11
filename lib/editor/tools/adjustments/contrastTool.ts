import { Contrast } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { WebGLFilterTool } from '../base/WebGLFilterTool'

/**
 * Contrast Tool - Adjust image contrast
 * Now uses layer-based filtering exclusively
 */
export class ContrastTool extends WebGLFilterTool {
  // Tool identification
  id = TOOL_IDS.CONTRAST
  name = 'Contrast'
  icon = Contrast
  cursor = 'default'
  shortcut = undefined // Access via adjustments menu
  isImplemented = true
  group = 'adjustment'
  
  // Filter type for the filter system
  protected filterType = 'contrast'
  
  protected setupTool(): void {
    // Set default contrast value
    this.setOption('adjustment', 0)
  }
  
  protected cleanupTool(): void {
    // Nothing to clean up
  }
  
  /**
   * Public method for programmatic contrast adjustment
   */
  async applyContrast(adjustment: number): Promise<void> {
    const params = {
      amount: adjustment / 100 // Convert UI percentage to WebGL range (-1 to 1)
    }
    await this.applyFilter(params)
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