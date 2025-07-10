import { Camera } from 'lucide-react'
import { WebGLFilterTool } from '../base/WebGLFilterTool'

export interface VintageEffect {
  id: string
  name: string
  description: string
  webglFilter: string
  supportsIntensity: boolean
  preview?: string // Base64 preview image
}

/**
 * Vintage Effects Tool - Apply vintage film effects
 * WebGL-only tool showcasing effects not possible with Konva
 */
export class VintageEffectsTool extends WebGLFilterTool {
  id = 'vintage-effects'
  name = 'Vintage Effects'
  icon = Camera
  cursor = 'default'
  shortcut = 'V'
  isImplemented = true
  group = 'filter'
  
  // Available vintage effects
  private effects: VintageEffect[] = [
    {
      id: 'brownie',
      name: 'Brownie',
      description: 'Classic brownie camera effect with warm tones',
      webglFilter: 'brownie',
      supportsIntensity: false
    },
    {
      id: 'vintage-pinhole',
      name: 'Vintage Pinhole',
      description: 'Pinhole camera effect with vignetting',
      webglFilter: 'vintagePinhole',
      supportsIntensity: false
    },
    {
      id: 'kodachrome',
      name: 'Kodachrome',
      description: 'Kodachrome film simulation with vibrant colors',
      webglFilter: 'kodachrome',
      supportsIntensity: false
    },
    {
      id: 'technicolor',
      name: 'Technicolor',
      description: 'Classic Technicolor film effect',
      webglFilter: 'technicolor',
      supportsIntensity: false
    },
    {
      id: 'polaroid',
      name: 'Polaroid',
      description: 'Instant camera effect with faded edges',
      webglFilter: 'polaroid',
      supportsIntensity: false
    }
  ]
  
  protected getFilterType(): string {
    const effectId = this.getOption('effect') as string
    const effect = this.effects.find(e => e.id === effectId)
    return effect?.webglFilter || 'brownie'
  }
  
  protected getDefaultParams(): Record<string, unknown> {
    return {
      effect: 'brownie',
      intensity: 100 // For future effects that support intensity
    }
  }
  
  protected convertOptionsToWebGLParams(options: Record<string, unknown>): Record<string, any> {
    // Most vintage effects don't have parameters
    // But we store effect type for metadata
    return {
      effect: options.effect as string
    }
  }
  
  /**
   * Apply a specific vintage effect
   */
  async applyVintageEffect(effectId: string): Promise<void> {
    const effect = this.effects.find(e => e.id === effectId)
    if (!effect) {
      console.warn(`[VintageEffectsTool] Unknown effect: ${effectId}`)
      return
    }
    
    this.setOption('effect', effectId)
    await this.applyFilter()
  }
  
  /**
   * Get all available effects
   */
  getAvailableEffects(): VintageEffect[] {
    return [...this.effects]
  }
  
  /**
   * Generate preview for an effect
   */
  async generatePreview(effectId: string, sourceImage: HTMLImageElement): Promise<string> {
    if (!this.filterManager) return ''
    
    const effect = this.effects.find(e => e.id === effectId)
    if (!effect) return ''
    
    try {
      // Create small preview (200x200)
      const canvas = document.createElement('canvas')
      const size = 200
      canvas.width = size
      canvas.height = size
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''
      
      // Draw scaled image
      const scale = Math.min(size / sourceImage.width, size / sourceImage.height)
      const width = sourceImage.width * scale
      const height = sourceImage.height * scale
      const x = (size - width) / 2
      const y = (size - height) / 2
      
      ctx.drawImage(sourceImage, x, y, width, height)
      
      // Apply effect to preview
      const previewImage = new Image()
      previewImage.src = canvas.toDataURL()
      
      await new Promise(resolve => {
        previewImage.onload = resolve
      })
      
      // Apply filter via manager
      const filtered = await this.filterManager.processWithWebGL(
        previewImage,
        effect.webglFilter,
        {}
      )
      
      return filtered.toDataURL('image/jpeg', 0.8)
      
    } catch (error) {
      console.error('[VintageEffectsTool] Preview generation failed:', error)
      return ''
    }
  }
  
  /**
   * Cycle through effects (for keyboard shortcut)
   */
  async cycleEffect(direction: 'next' | 'previous'): Promise<void> {
    const currentEffect = this.getOption('effect') as string
    const currentIndex = this.effects.findIndex(e => e.id === currentEffect)
    
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
    await this.removeFilter()
  }
}

// Export singleton instance
export const vintageEffectsTool = new VintageEffectsTool() 