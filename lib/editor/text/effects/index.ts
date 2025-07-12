export { type TextEffects, type DropShadowOptions, type StrokeOptions, type GlowOptions, type GradientOptions } from './LayerStyles'
export { TextWarp, type WarpStyle, type WarpOptions } from './TextWarp'

// Konva-compatible text layer styles
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { TextEffects, StrokeOptions, GradientOptions } from './LayerStyles'
import Konva from 'konva'

export class KonvaTextLayerStyles {
  static applyStroke(object: CanvasObject | null, options: StrokeOptions): void {
    if (!object || (object.type !== 'text' && object.type !== 'verticalText')) {
      return
    }
    
    const textNode = object.node as Konva.Text
    if (!textNode || !(textNode instanceof Konva.Text)) {
      return
    }
    
    textNode.stroke(options.color)
    textNode.strokeWidth(options.width)
    
    // Store stroke info in object metadata
    object.metadata = {
      ...object.metadata,
      stroke: options.color,
      strokeWidth: options.width,
      strokePosition: options.position
    }
    
    // Force redraw
    textNode.getLayer()?.batchDraw()
  }
  
  static removeStroke(object: CanvasObject | null): void {
    if (!object || (object.type !== 'text' && object.type !== 'verticalText')) {
      return
    }
    
    const textNode = object.node as Konva.Text
    if (!textNode || !(textNode instanceof Konva.Text)) {
      return
    }
    
    textNode.stroke(null)
    textNode.strokeWidth(0)
    
    // Remove stroke info from metadata
    if (object.metadata) {
      delete object.metadata.stroke
      delete object.metadata.strokeWidth
      delete object.metadata.strokePosition
    }
    
    // Force redraw
    const layer = textNode.getLayer()
    if (layer) {
      layer.batchDraw()
    }
  }
  
  static applyGradientFill(object: CanvasObject, options: GradientOptions): void {
    if (!object || (object.type !== 'text' && object.type !== 'verticalText')) {
      return
    }
    
    const textNode = object.node as Konva.Text
    if (!textNode || !(textNode instanceof Konva.Text)) {
      return
    }
    
    // For now, just use the first color stop
    // TODO: Implement proper gradient support with Konva
    if (options.colorStops && options.colorStops.length > 0) {
      textNode.fill(options.colorStops[0].color)
    }
    
    // Store gradient info in metadata for future implementation
    object.metadata = {
      ...object.metadata,
      gradientFill: options
    }
    
    // Force redraw
    const layer = textNode.getLayer()
    if (layer) {
      layer.batchDraw()
    }
  }
  
  static applyEffects(object: CanvasObject, effects: TextEffects): void {
    if (!object || (object.type !== 'text' && object.type !== 'verticalText')) {
      return
    }
    
    const textNode = object.node as Konva.Text
    if (!textNode || !(textNode instanceof Konva.Text)) {
      return
    }
    
    // Apply drop shadow
    if (effects.dropShadow) {
      const angleRad = (effects.dropShadow.angle * Math.PI) / 180
      const offsetX = effects.dropShadow.distance * Math.cos(angleRad)
      const offsetY = effects.dropShadow.distance * Math.sin(angleRad)
      
      textNode.shadowColor(effects.dropShadow.color)
      textNode.shadowBlur(effects.dropShadow.blur)
      textNode.shadowOffsetX(offsetX)
      textNode.shadowOffsetY(offsetY)
      textNode.shadowOpacity(effects.dropShadow.opacity)
    }
    
    // Apply stroke
    if (effects.stroke) {
      this.applyStroke(object, effects.stroke)
    }
    
    // Apply gradient
    if (effects.gradient) {
      this.applyGradientFill(object, effects.gradient)
    }
    
    // Store all effects in metadata
    object.metadata = {
      ...object.metadata,
      textEffects: effects
    }
    
    // Force redraw
    const layer = textNode.getLayer()
    if (layer) {
      layer.batchDraw()
    }
  }
}

// Re-export the Konva version as the default TextLayerStyles for components
export { KonvaTextLayerStyles as TextLayerStyles }

// Export enhanced implementations
export * from './EnhancedTextWarp'
export * from './EnhancedLayerStyles' 