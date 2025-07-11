import { Sun } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { WebGLFilterTool } from '../base/WebGLFilterTool'

/**
 * Brightness Tool - Adjust image brightness
 * Now uses layer-based filtering exclusively
 */
export class BrightnessTool extends WebGLFilterTool {
  // Tool identification
  id = TOOL_IDS.BRIGHTNESS
  name = 'Brightness'
  icon = Sun
  cursor = 'default'
  shortcut = 'B'
  isImplemented = true
  group = 'adjustment'
  
  // Filter type for the filter system
  protected filterType = 'brightness'
  
  protected setupTool(): void {
    // Set default brightness value
    this.setOption('adjustment', 0)
  }
  
  protected cleanupTool(): void {
    // Nothing to clean up
  }
  
  /**
   * Public method for programmatic brightness adjustment
   */
  async applyBrightness(adjustment: number): Promise<void> {
    const params = {
      amount: adjustment / 100 // Convert UI percentage to WebGL range (-1 to 1)
    }
    await this.applyFilter(params)
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