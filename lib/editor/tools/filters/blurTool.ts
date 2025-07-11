import { Brush } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { ObjectWebGLFilterTool } from '../base/ObjectWebGLFilterTool'

/**
 * Object-based Blur Tool
 * Applies gaussian blur to selected objects using WebGL
 */
export class BlurTool extends ObjectWebGLFilterTool {
  // Tool identification
  id = TOOL_IDS.BLUR
  name = 'Blur'
  icon = Brush
  cursor = 'default'
  shortcut = undefined // Accessed via filters panel
  
  // Filter configuration
  protected getFilterType(): string {
    return 'blur'
  }
  
  protected getDefaultParams(): Record<string, number> {
    return {
      radius: 0 // Range: 0 to 50 pixels
    }
  }
  
  // Tool options configuration
  static options = [
    {
      id: 'radius',
      type: 'slider' as const,
      label: 'Blur Radius',
      min: 0,
      max: 50,
      default: 0,
      step: 1,
      suffix: 'px'
    }
  ]
  
  /**
   * Convert UI value to WebGL parameter
   */
  protected getAllOptions(): Record<string, number> {
    const radius = (this.getOption('radius') as number) || 0
    return {
      radius // Pass directly, WebGL shader expects pixel radius
    }
  }
  
  /**
   * Public method for programmatic blur application
   */
  async applyBlur(blurRadius: number): Promise<void> {
    this.setOption('radius', blurRadius)
    await this.applyImmediate()
  }
  
  /**
   * Get blur range for UI
   */
  getBlurRange(): { min: number; max: number; step: number } {
    return {
      min: 0,
      max: 50,
      step: 1
    }
  }
}

// Export singleton instance
export const blurTool = new BlurTool() 