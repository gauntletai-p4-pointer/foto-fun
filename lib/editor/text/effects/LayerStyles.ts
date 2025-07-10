import Konva from 'konva'
import type { CanvasObject } from '@/lib/editor/canvas/types'

// Type for text objects in our system
type TextObject = CanvasObject & {
  type: 'text' | 'verticalText'
  node: Konva.Text
}

// Custom properties for text effects
interface TextEffectsData {
  dropShadow?: DropShadowOptions
  stroke?: StrokeOptions
  glow?: GlowOptions
  gradient?: GradientOptions
  originalFill?: string
}

/**
 * Text Layer Styles - Provides Photoshop-like layer effects for text
 * Uses Konva's built-in effects and filters
 */
export class TextLayerStyles {
  /**
   * Apply drop shadow effect to text
   */
  static applyDropShadow(textObject: TextObject, options: DropShadowOptions): void {
    const textNode = textObject.node
    
    // Calculate shadow offset based on angle and distance
    const angleRad = (options.angle * Math.PI) / 180
    const offsetX = options.distance * Math.cos(angleRad)
    const offsetY = options.distance * Math.sin(angleRad)
    
    // Apply shadow to Konva text node
    textNode.shadowColor(options.color)
    textNode.shadowBlur(options.blur)
    textNode.shadowOffset({ x: offsetX, y: offsetY })
    textNode.shadowOpacity(options.opacity)
    
    // Store effect data
    this.storeEffectData(textObject, 'dropShadow', options)
  }
  
  /**
   * Remove drop shadow from text
   */
  static removeDropShadow(textObject: TextObject): void {
    const textNode = textObject.node
    
    textNode.shadowColor('transparent')
    textNode.shadowBlur(0)
    textNode.shadowOffset({ x: 0, y: 0 })
    textNode.shadowOpacity(0)
    
    this.removeEffectData(textObject, 'dropShadow')
  }
  
  /**
   * Apply stroke (outline) effect to text
   */
  static applyStroke(textObject: TextObject, options: StrokeOptions): void {
    const textNode = textObject.node
    
    textNode.stroke(options.color)
    textNode.strokeWidth(options.width)
    
    // Store effect data
    this.storeEffectData(textObject, 'stroke', options)
  }
  
  /**
   * Remove stroke from text
   */
  static removeStroke(textObject: TextObject): void {
    const textNode = textObject.node
    
    textNode.stroke(null)
    textNode.strokeWidth(0)
    
    this.removeEffectData(textObject, 'stroke')
  }
  
  /**
   * Apply glow effect to text
   * Uses shadow with 0 offset to create glow
   */
  static applyGlow(textObject: TextObject, options: GlowOptions): void {
    const textNode = textObject.node
    
    if (options.type === 'outer') {
      // Outer glow using shadow
      textNode.shadowColor(options.color)
      textNode.shadowBlur(options.size)
      textNode.shadowOffset({ x: 0, y: 0 })
      textNode.shadowOpacity(options.opacity)
      textNode.shadowEnabled(true)
    } else {
      // Inner glow using filters
      // Create a custom filter for inner glow
      textNode.cache()
      textNode.filters([this.createInnerGlowFilter(options)])
    }
    
    // Store effect data
    this.storeEffectData(textObject, 'glow', options)
  }
  
  /**
   * Create inner glow filter
   */
  private static createInnerGlowFilter(options: GlowOptions): (imageData: ImageData) => void {
    return function(imageData: ImageData) {
      // Simple inner glow implementation
      const data = imageData.data
      const width = imageData.width
      const height = imageData.height
      const glowColor = Konva.Util.getRGB(options.color)
      
      // Create a glow effect by modifying pixels
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4
          
          // Check if pixel has alpha
          if (data[idx + 3] > 0) {
            // Blend with glow color
            const alpha = data[idx + 3] / 255
            const glowStrength = options.opacity * alpha
            
            data[idx] = Math.round(data[idx] * (1 - glowStrength) + glowColor.r * glowStrength)
            data[idx + 1] = Math.round(data[idx + 1] * (1 - glowStrength) + glowColor.g * glowStrength)
            data[idx + 2] = Math.round(data[idx + 2] * (1 - glowStrength) + glowColor.b * glowStrength)
          }
        }
      }
    }
  }
  
  /**
   * Remove glow from text
   */
  static removeGlow(textObject: TextObject): void {
    const textNode = textObject.node
    
    // Remove shadow-based glow
    textNode.shadowColor('transparent')
    textNode.shadowBlur(0)
    textNode.shadowEnabled(false)
    
    // Remove filter-based glow
    textNode.filters([])
    textNode.clearCache()
    
    this.removeEffectData(textObject, 'glow')
  }
  
  /**
   * Apply gradient fill to text
   */
  static applyGradientFill(textObject: TextObject, options: GradientOptions): void {
    const textNode = textObject.node
    const bounds = textNode.getClientRect()
    
    // Store original fill if not already stored
    const effectsData = this.getEffectsData(textObject)
    if (!effectsData.originalFill) {
      effectsData.originalFill = textNode.fill() as string
    }
    
    if (options.type === 'linear') {
      const angle = options.angle || 0
      const angleRad = (angle * Math.PI) / 180
      
      const gradientLength = Math.sqrt(bounds.width * bounds.width + bounds.height * bounds.height)
      const centerX = bounds.width / 2
      const centerY = bounds.height / 2
      
      textNode.fillLinearGradientStartPoint({
        x: centerX - (gradientLength / 2) * Math.cos(angleRad),
        y: centerY - (gradientLength / 2) * Math.sin(angleRad)
      })
      
      textNode.fillLinearGradientEndPoint({
        x: centerX + (gradientLength / 2) * Math.cos(angleRad),
        y: centerY + (gradientLength / 2) * Math.sin(angleRad)
      })
      
      textNode.fillLinearGradientColorStops(
        options.colorStops.flatMap(stop => [stop.offset, stop.color])
      )
    } else {
      // Radial gradient
      textNode.fillRadialGradientStartPoint({ x: bounds.width / 2, y: bounds.height / 2 })
      textNode.fillRadialGradientEndPoint({ x: bounds.width / 2, y: bounds.height / 2 })
      textNode.fillRadialGradientStartRadius(0)
      textNode.fillRadialGradientEndRadius(Math.max(bounds.width, bounds.height) / 2)
      textNode.fillRadialGradientColorStops(
        options.colorStops.flatMap(stop => [stop.offset, stop.color])
      )
    }
    
    // Store effect data
    this.storeEffectData(textObject, 'gradient', options)
  }
  
  /**
   * Apply pattern fill to text
   */
  static async applyPattern(textObject: TextObject, patternImage: HTMLImageElement, repeat: string = 'repeat'): Promise<void> {
    const textNode = textObject.node
    
    // Store original fill if not already stored
    const effectsData = this.getEffectsData(textObject)
    if (!effectsData.originalFill) {
      effectsData.originalFill = textNode.fill() as string
    }
    
    textNode.fillPatternImage(patternImage)
    textNode.fillPatternRepeat(repeat)
  }
  
  /**
   * Apply multiple effects at once
   */
  static applyEffects(textObject: TextObject, effects: TextEffects): void {
    if (effects.dropShadow) {
      this.applyDropShadow(textObject, effects.dropShadow)
    }
    
    if (effects.stroke) {
      this.applyStroke(textObject, effects.stroke)
    }
    
    if (effects.glow) {
      this.applyGlow(textObject, effects.glow)
    }
    
    if (effects.gradient) {
      this.applyGradientFill(textObject, effects.gradient)
    }
  }
  
  /**
   * Remove all effects from text
   */
  static removeAllEffects(textObject: TextObject): void {
    this.removeDropShadow(textObject)
    this.removeStroke(textObject)
    this.removeGlow(textObject)
    
    // Restore original fill
    const effectsData = this.getEffectsData(textObject)
    if (effectsData.originalFill) {
      textObject.node.fill(effectsData.originalFill)
      textObject.node.fillLinearGradientColorStops(null)
      textObject.node.fillRadialGradientColorStops(null)
      textObject.node.fillPatternImage(null)
    }
    
    // Clear all effects data
    textObject.metadata = textObject.metadata || {}
    delete textObject.metadata.textEffects
  }
  
  /**
   * Store effect data in text object metadata
   */
  private static storeEffectData(textObject: TextObject, effectType: string, data: DropShadowOptions | StrokeOptions | GlowOptions | GradientOptions): void {
    textObject.metadata = textObject.metadata || {}
    textObject.metadata.textEffects = textObject.metadata.textEffects || {}
    textObject.metadata.textEffects[effectType] = data
  }
  
  /**
   * Remove effect data from text object metadata
   */
  private static removeEffectData(textObject: TextObject, effectType: string): void {
    if (textObject.metadata?.textEffects) {
      delete textObject.metadata.textEffects[effectType]
    }
  }
  
  /**
   * Get effects data from text object
   */
  private static getEffectsData(textObject: TextObject): TextEffectsData {
    textObject.metadata = textObject.metadata || {}
    textObject.metadata.textEffects = textObject.metadata.textEffects || {}
    return textObject.metadata.textEffects as TextEffectsData
  }
}

// Type definitions
export interface DropShadowOptions {
  color: string
  opacity: number
  angle: number // in degrees
  distance: number // in pixels
  blur: number // blur radius
  spread?: number // not directly supported by Konva
}

export interface StrokeOptions {
  color: string
  width: number
  position: 'outside' | 'inside' | 'center' // Note: Konva doesn't distinguish these
  opacity?: number
  gradient?: GradientOptions
}

export interface GlowOptions {
  type: 'outer' | 'inner'
  color: string
  size: number // blur size
  opacity: number
  technique?: 'softer' | 'precise'
}

export interface GradientOptions {
  type: 'linear' | 'radial'
  angle?: number // for linear gradients, in degrees
  colorStops: Array<{
    offset: number // 0-1
    color: string
  }>
}

export interface TextEffects {
  dropShadow?: DropShadowOptions
  stroke?: StrokeOptions
  glow?: GlowOptions
  gradient?: GradientOptions
} 