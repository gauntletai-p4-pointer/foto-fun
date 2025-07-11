import { Camera } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { ObjectWebGLFilterTool } from '../base/ObjectWebGLFilterTool'

export interface VintageEffect {
  id: string
  name: string
  description: string
  webglFilter: string
  preview?: string // Base64 preview image
}

/**
 * Object-based Vintage Effects Tool
 * Applies vintage film effects to selected objects using WebGL
 */
export class VintageEffectsTool extends ObjectWebGLFilterTool {
  id = TOOL_IDS.VINTAGE_EFFECTS
  name = 'Vintage Effects'
  icon = Camera
  cursor = 'default'
  shortcut = undefined // Accessed via filters panel
  
  // Available vintage effects
  private effects: VintageEffect[] = [
    {
      id: 'brownie',
      name: 'Brownie',
      description: 'Classic brownie camera effect with warm tones',
      webglFilter: 'brownie'
    },
    {
      id: 'vintage-pinhole',
      name: 'Vintage Pinhole',
      description: 'Pinhole camera effect with vignetting',
      webglFilter: 'vintagePinhole'
    },
    {
      id: 'kodachrome',
      name: 'Kodachrome',
      description: 'Kodachrome film simulation with vibrant colors',
      webglFilter: 'kodachrome'
    },
    {
      id: 'technicolor',
      name: 'Technicolor',
      description: 'Classic Technicolor film effect',
      webglFilter: 'technicolor'
    },
    {
      id: 'polaroid',
      name: 'Polaroid',
      description: 'Instant camera effect with faded edges',
      webglFilter: 'polaroid'
    },
    {
      id: 'sepia',
      name: 'Sepia',
      description: 'Classic sepia tone effect',
      webglFilter: 'sepia'
    }
  ]
  
  // Current effect
  private currentEffect = 'brownie'
  
  // Filter configuration
  protected getFilterType(): string {
    const effect = this.effects.find(e => e.id === this.currentEffect)
    return effect?.webglFilter || 'brownie'
  }
  
  protected getDefaultParams(): Record<string, number | string> {
    return {
      effect: 'brownie',
      intensity: 1 // 0 = no effect, 1 = full effect
    }
  }
  
  // Tool options configuration
  static options = [
    {
      id: 'effect',
      type: 'select' as const,
      label: 'Effect',
      options: [
        { value: 'brownie', label: 'Brownie' },
        { value: 'vintage-pinhole', label: 'Vintage Pinhole' },
        { value: 'kodachrome', label: 'Kodachrome' },
        { value: 'technicolor', label: 'Technicolor' },
        { value: 'polaroid', label: 'Polaroid' },
        { value: 'sepia', label: 'Sepia' }
      ],
      default: 'brownie'
    },
    {
      id: 'intensity',
      type: 'slider' as const,
      label: 'Intensity',
      min: 0,
      max: 100,
      default: 100,
      step: 1,
      suffix: '%'
    }
  ]
  
  /**
   * Handle option changes
   */
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'effect' && typeof value === 'string') {
      this.currentEffect = value
    }
    // Call parent implementation to trigger filter update
    super.onOptionChange(key, value)
  }
  
  /**
   * Convert UI values to WebGL parameters
   */
  protected getAllOptions(): Record<string, number | string> {
    const effect = (this.getOption('effect') as string) || 'brownie'
    const intensity = (this.getOption('intensity') as number) || 100
    
    this.currentEffect = effect
    
    return {
      effect,
      intensity: intensity / 100 // Convert percentage to 0-1 range
    }
  }
  
  /**
   * Apply a specific vintage effect
   */
  async applyVintageEffect(effectId: string, intensity: number = 100): Promise<void> {
    const effect = this.effects.find(e => e.id === effectId)
    if (!effect) {
      console.warn(`[VintageEffectsTool] Unknown effect: ${effectId}`)
      return
    }
    
    this.setOption('effect', effectId)
    this.setOption('intensity', intensity)
    await this.applyImmediate()
  }
  
  /**
   * Get all available effects
   */
  getAvailableEffects(): VintageEffect[] {
    return [...this.effects]
  }
  
  /**
   * Cycle through effects (for keyboard shortcut)
   */
  async cycleEffect(direction: 'next' | 'previous'): Promise<void> {
    const currentIndex = this.effects.findIndex(e => e.id === this.currentEffect)
    
    let newIndex: number
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % this.effects.length
    } else {
      newIndex = currentIndex - 1
      if (newIndex < 0) newIndex = this.effects.length - 1
    }
    
    const newEffect = this.effects[newIndex]
    await this.applyVintageEffect(newEffect.id)
  }
  
  /**
   * Remove vintage effect (restore original)
   */
  async removeVintageEffect(): Promise<void> {
    this.setOption('intensity', 0)
    await this.applyImmediate()
  }
}

// Export singleton instance
export const vintageEffectsTool = new VintageEffectsTool() 