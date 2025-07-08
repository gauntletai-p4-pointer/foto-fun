import { IText, Textbox, Shadow, Gradient, Pattern } from 'fabric'

// Type alias for text objects that can have effects
type TextObject = IText | Textbox

// Custom properties we add to text objects
type TextObjectWithEffects = TextObject & {
  innerGlow?: {
    color: string
    size: number
    opacity: number
  }
  _originalRender?: () => void
}

/**
 * Text Layer Styles - Provides Photoshop-like layer effects for text
 * Includes drop shadow, stroke, glow, gradients, and patterns
 */
export class TextLayerStyles {
  /**
   * Apply drop shadow effect to text
   */
  static applyDropShadow(text: TextObject, options: DropShadowOptions): void {
    // Calculate shadow offset based on angle and distance
    const angleRad = (options.angle * Math.PI) / 180
    const offsetX = options.distance * Math.cos(angleRad)
    const offsetY = options.distance * Math.sin(angleRad)
    
    text.set({
      shadow: new Shadow({
        color: options.color,
        blur: options.blur,
        offsetX: offsetX,
        offsetY: offsetY,
        // Note: Fabric.js doesn't support opacity directly in Shadow
        // We'll need to use rgba color with alpha channel
      })
    })
  }
  
  /**
   * Remove drop shadow from text
   */
  static removeDropShadow(text: TextObject): void {
    text.set({ shadow: null })
  }
  
  /**
   * Apply stroke (outline) effect to text
   */
  static applyStroke(text: TextObject, options: StrokeOptions): void {
    text.set({
      stroke: options.color,
      strokeWidth: options.width,
      strokeLineJoin: 'round',
      strokeLineCap: 'round',
    })
    
    // Handle stroke position
    if (options.position === 'outside') {
      text.set({ paintFirst: 'stroke' })
    } else if (options.position === 'inside') {
      // For inside stroke, we need to use paintFirst 'fill'
      // This isn't perfect but Fabric.js doesn't have true inside stroke
      text.set({ paintFirst: 'fill' })
    } else {
      // Center (default)
      text.set({ paintFirst: 'fill' })
    }
  }
  
  /**
   * Remove stroke from text
   */
  static removeStroke(text: TextObject): void {
    text.set({
      stroke: null,
      strokeWidth: 0,
    })
  }
  
  /**
   * Apply glow effect to text
   * Uses shadow with 0 offset to create glow
   */
  static applyGlow(text: TextObject, options: GlowOptions): void {
    if (options.type === 'outer') {
      // Outer glow using shadow
      text.set({
        shadow: new Shadow({
          color: options.color,
          blur: options.size,
          offsetX: 0,
          offsetY: 0,
        })
      })
    } else {
      // Inner glow is more complex and requires custom rendering
      // For now, we'll store it as a custom property
      const textWithGlow = text as TextObjectWithEffects
      textWithGlow.innerGlow = {
        color: options.color,
        size: options.size,
        opacity: options.opacity,
      }
      
      // We'll need to override the render method to apply inner glow
      this.applyInnerGlowRender(text, options)
    }
  }
  
  /**
   * Apply inner glow rendering (requires custom render override)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static applyInnerGlowRender(text: TextObject, _options: GlowOptions): void {
    // Store the original render method
    const originalRender = text._render.bind(text)
    
    // Override render to add inner glow effect
    text._render = function(ctx: CanvasRenderingContext2D) {
      // Save context state
      ctx.save()
      
      // Render the text normally first
      originalRender(ctx)
      
      // Apply inner glow using composite operations
      const textWithGlow = this as TextObjectWithEffects
      if (textWithGlow.innerGlow) {
        const glow = textWithGlow.innerGlow
        ctx.globalCompositeOperation = 'source-atop'
        ctx.shadowColor = glow.color
        ctx.shadowBlur = glow.size
        ctx.fillStyle = glow.color
        
        // Create inner glow by drawing the text multiple times
        for (let i = 0; i < 3; i++) {
          ctx.fillText(this.text || '', 0, 0)
        }
      }
      
      // Restore context
      ctx.restore()
    }
  }
  
  /**
   * Remove glow from text
   */
  static removeGlow(text: TextObject): void {
    text.set({ shadow: null })
    const textWithGlow = text as TextObjectWithEffects
    delete textWithGlow.innerGlow
    
    // Restore original render if it was overridden
    if (textWithGlow._originalRender) {
      text._render = textWithGlow._originalRender
      delete textWithGlow._originalRender
    }
  }
  
  /**
   * Apply gradient fill to text
   */
  static applyGradientFill(text: TextObject, options: GradientOptions): void {
    const coords = this.calculateGradientCoords(text, options)
    
    const gradient = new Gradient({
      type: options.type,
      coords: coords,
      colorStops: options.colorStops,
    })
    
    text.set({ fill: gradient })
  }
  
  /**
   * Calculate gradient coordinates based on text bounds and options
   */
  private static calculateGradientCoords(text: TextObject, options: GradientOptions): Record<string, number> {
    const width = text.width || 100
    const height = text.height || 100
    
    if (options.type === 'linear') {
      // Calculate linear gradient coords based on angle
      const angle = options.angle || 0
      const angleRad = (angle * Math.PI) / 180
      
      // Calculate start and end points
      const centerX = width / 2
      const centerY = height / 2
      const maxDist = Math.sqrt(width * width + height * height) / 2
      
      return {
        x1: centerX - maxDist * Math.cos(angleRad),
        y1: centerY - maxDist * Math.sin(angleRad),
        x2: centerX + maxDist * Math.cos(angleRad),
        y2: centerY + maxDist * Math.sin(angleRad),
      }
    } else {
      // Radial gradient
      return {
        x1: width / 2,
        y1: height / 2,
        x2: width / 2,
        y2: height / 2,
        r1: 0,
        r2: Math.max(width, height) / 2,
      }
    }
  }
  
  /**
   * Apply pattern fill to text
   */
  static applyPattern(text: TextObject, pattern: Pattern): void {
    text.set({ fill: pattern })
  }
  
  /**
   * Apply multiple effects at once
   */
  static applyEffects(text: TextObject, effects: TextEffects): void {
    if (effects.dropShadow) {
      this.applyDropShadow(text, effects.dropShadow)
    }
    
    if (effects.stroke) {
      this.applyStroke(text, effects.stroke)
    }
    
    if (effects.glow) {
      this.applyGlow(text, effects.glow)
    }
    
    if (effects.gradient) {
      this.applyGradientFill(text, effects.gradient)
    }
  }
  
  /**
   * Remove all effects from text
   */
  static removeAllEffects(text: TextObject): void {
    this.removeDropShadow(text)
    this.removeStroke(text)
    this.removeGlow(text)
    
    // Reset fill to solid color if it was gradient/pattern
    if (text.fill && typeof text.fill !== 'string') {
      text.set({ fill: '#000000' })
    }
  }
}

// Type definitions
export interface DropShadowOptions {
  color: string
  opacity: number
  angle: number // in degrees
  distance: number // in pixels
  blur: number // blur radius
  spread?: number // not supported by Fabric.js
}

export interface StrokeOptions {
  color: string
  width: number
  position: 'outside' | 'inside' | 'center'
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