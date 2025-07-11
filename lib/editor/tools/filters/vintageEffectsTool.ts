import { Camera } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { WebGLFilterTool } from '../base/WebGLFilterTool'
import type { FilterTarget } from '@/lib/editor/filters/FilterManager'
import type { Filter } from '@/lib/editor/canvas/types'

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
 * Now uses layer-based filtering exclusively
 */
export class VintageEffectsTool extends WebGLFilterTool {
  id = TOOL_IDS.VINTAGE_EFFECTS
  name = 'Vintage Effects'
  icon = Camera
  cursor = 'default'
  shortcut = 'V'
  isImplemented = true
  group = 'filter'
  
  // Filter type - will be set dynamically based on selected effect
  protected filterType = 'vintage'
  
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
  
  protected setupTool(): void {
    // Set default effect
    this.setOption('effect', 'brownie')
    this.setOption('intensity', 100)
  }
  
  protected cleanupTool(): void {
    // Nothing to clean up
  }
  
  /**
   * Handle option changes from the UI
   */
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'effect' && typeof value === 'string') {
      const effect = this.effects.find(e => e.id === value)
      if (effect) {
        // Update the filter type based on selected effect
        this.filterType = effect.webglFilter
        // Apply the effect
        this.applyVintageEffect(value)
      }
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
    
    // Update filter type
    this.filterType = effect.webglFilter
    
    // Apply filter with effect parameters
    const params = {
      effect: effectId
    }
    
    await this.applyFilter(params)
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
    const canvas = this.getCanvas()
    const filterManager = canvas.getFilterManager?.()
    
    if (!filterManager) return ''
    
    const effect = this.effects.find(e => e.id === effectId)
    if (!effect) return ''
    
    try {
      // Create small preview (200x200)
      const previewCanvas = document.createElement('canvas')
      const size = 200
      previewCanvas.width = size
      previewCanvas.height = size
      
      const ctx = previewCanvas.getContext('2d')
      if (!ctx) return ''
      
      // Draw scaled image
      const scale = Math.min(size / sourceImage.width, size / sourceImage.height)
      const width = sourceImage.width * scale
      const height = sourceImage.height * scale
      const x = (size - width) / 2
      const y = (size - height) / 2
      
      ctx.drawImage(sourceImage, x, y, width, height)
      
      // Apply effect to preview using WebGL filter manager directly
      const webglFilterManager = (filterManager as any).webglFilterManager
      if (webglFilterManager) {
        const filtered = await webglFilterManager.processWithWebGL(
          previewCanvas,
          effect.webglFilter,
          {}
        )
        
        return filtered.toDataURL('image/jpeg', 0.8)
      }
      
      return previewCanvas.toDataURL('image/jpeg', 0.8)
      
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
    const canvas = this.getCanvas()
    const filterManager = canvas.getFilterManager?.()
    const activeLayer = canvas.getActiveLayer()
    
    if (!filterManager || !activeLayer) {
      return
    }
    
    // Find and remove any vintage filter from layer
    if (activeLayer.filterStack) {
      const vintageFilters = activeLayer.filterStack.filters.filter(
        f => this.effects.some(e => e.webglFilter === f.filter.type)
      )
      
      for (const filter of vintageFilters) {
        await filterManager.removeFilterFromLayer(
          activeLayer.id,
          filter.id,
          this.executionContext
        )
      }
    }
  }
}

// Export singleton instance
export const vintageEffectsTool = new VintageEffectsTool() 