import { Palette } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { ObjectWebGLFilterTool } from '../base/ObjectWebGLFilterTool'

/**
 * Object-based Hue Tool
 * Rotates colors of selected objects on the color wheel using WebGL
 */
export class HueTool extends ObjectWebGLFilterTool {
  // Tool identification
  id = TOOL_IDS.HUE
  name = 'Hue'
  icon = Palette
  cursor = 'default'
  shortcut = undefined // Accessed via adjustments panel
  
  // Filter configuration
  protected getFilterType(): string {
    return 'hue'
  }
  
  protected getDefaultParams(): Record<string, any> {
    return {
      rotation: 0 // Range: 0 to 360 degrees
    }
  }
  
  // Tool options configuration
  static options = [
    {
      id: 'rotation',
      type: 'slider' as const,
      label: 'Hue',
      min: -180,
      max: 180,
      default: 0,
      step: 1,
      suffix: '°'
    }
  ]
  
  /**
   * Convert UI value to WebGL parameter
   */
  protected getAllOptions(): Record<string, any> {
    const rotation = (this.getOption('rotation') as number) || 0
    return {
      rotation: rotation / 360 // Convert to 0-1 range for WebGL shader
    }
  }
  
  /**
   * Public method for programmatic hue adjustment
   */
  async applyHue(rotation: number): Promise<void> {
    this.setOption('rotation', rotation)
    await this.applyImmediate()
  }
  
  /**
   * Get hue range for UI
   */
  getHueRange(): { min: number; max: number; step: number } {
    return {
      min: -180,
      max: 180,
      step: 1
    }
  }
}

// Export singleton instance
export const hueTool = new HueTool() 