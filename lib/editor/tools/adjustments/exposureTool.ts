import { Aperture } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { ObjectWebGLFilterTool } from '../base/ObjectWebGLFilterTool'

/**
 * Object-based Exposure Tool
 * Adjusts exposure compensation of selected objects using WebGL
 */
export class ExposureTool extends ObjectWebGLFilterTool {
  // Tool identification
  id = TOOL_IDS.EXPOSURE
  name = 'Exposure'
  icon = Aperture
  cursor = 'default'
  shortcut = undefined // Accessed via adjustments panel
  
  // Filter configuration
  protected getFilterType(): string {
    return 'exposure'
  }
  
  protected getDefaultParams(): Record<string, any> {
    return {
      stops: 0 // Range: -3 to 3 (exposure stops)
    }
  }
  
  // Tool options configuration
  static options = [
    {
      id: 'stops',
      type: 'slider' as const,
      label: 'Exposure',
      min: -3,
      max: 3,
      default: 0,
      step: 0.1,
      suffix: ' EV'
    }
  ]
  
  /**
   * Convert UI value to WebGL parameter
   */
  protected getAllOptions(): Record<string, any> {
    const stops = (this.getOption('stops') as number) || 0
    return {
      stops // Pass directly, WebGL shader will handle conversion
    }
  }
  
  /**
   * Public method for programmatic exposure adjustment
   */
  async applyExposure(exposureStops: number): Promise<void> {
    this.setOption('stops', exposureStops)
    await this.applyImmediate()
  }
  
  /**
   * Get exposure range for UI
   */
  getExposureRange(): { min: number; max: number; step: number } {
    return {
      min: -3,
      max: 3,
      step: 0.1
    }
  }
}

// Export singleton instance
export const exposureTool = new ExposureTool() 