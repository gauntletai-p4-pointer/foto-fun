import Konva from 'konva'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { nanoid } from 'nanoid'

interface LayerStylesConfig {
  quality?: 'low' | 'medium' | 'high'
  realtime?: boolean
  caching?: boolean
}

// Layer style types
export interface DropShadowStyle {
  enabled: boolean
  color: string
  opacity: number
  angle: number // degrees
  distance: number // pixels
  spread: number // 0-100
  size: number // blur radius
}

export interface InnerShadowStyle {
  enabled: boolean
  color: string
  opacity: number
  angle: number
  distance: number
  choke: number // 0-100
  size: number
}

export interface OuterGlowStyle {
  enabled: boolean
  color: string
  opacity: number
  spread: number
  size: number
  technique: 'softer' | 'precise'
  range: number // 0-100
}

export interface InnerGlowStyle {
  enabled: boolean
  color: string
  opacity: number
  choke: number
  size: number
  technique: 'softer' | 'precise'
  source: 'center' | 'edge'
}

export interface BevelEmbossStyle {
  enabled: boolean
  style: 'inner' | 'outer' | 'emboss' | 'pillow' | 'stroke'
  technique: 'smooth' | 'chisel-hard' | 'chisel-soft'
  depth: number // 0-1000
  direction: 'up' | 'down'
  size: number
  soften: number
  angle: number
  altitude: number
  highlightColor: string
  highlightOpacity: number
  shadowColor: string
  shadowOpacity: number
}

export interface StrokeStyle {
  enabled: boolean
  size: number
  position: 'outside' | 'inside' | 'center'
  opacity: number
  fillType: 'color' | 'gradient' | 'pattern'
  color?: string
  gradient?: GradientStyle
  pattern?: PatternStyle
}

export interface GradientStyle {
  type: 'linear' | 'radial'
  angle?: number // for linear
  scale?: number // for radial
  colors: Array<{
    color: string
    position: number // 0-1
  }>
}

export interface PatternStyle {
  image: string // URL or data URL
  scale: number
  opacity: number
}

export interface LayerStyles {
  dropShadow?: DropShadowStyle
  innerShadow?: InnerShadowStyle
  outerGlow?: OuterGlowStyle
  innerGlow?: InnerGlowStyle
  bevelEmboss?: BevelEmbossStyle
  stroke?: StrokeStyle
  opacity?: number
  fillOpacity?: number
  blendMode?: string
}

/**
 * Enhanced Layer Styles - Professional-grade text and shape effects
 * Now uses dependency injection instead of singleton pattern
 */
export class EnhancedLayerStyles {
  private typedEventBus: TypedEventBus
  private config: LayerStylesConfig
  private effectCache = new Map<string, Konva.Group>()

  constructor(
    typedEventBus: TypedEventBus,
    config: LayerStylesConfig = {}
  ) {
    this.typedEventBus = typedEventBus
    this.config = {
      quality: 'high',
      realtime: true,
      caching: true,
      ...config
    }
  }

  /**
   * Apply layer styles to a Konva node
   * Returns a group containing the styled node
   */
  applyStyles(
    node: Konva.Node,
    styles: LayerStyles,
    canvasObject?: CanvasObject
  ): Konva.Group {
    // Create a group to hold all effects
    const group = new Konva.Group({
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      draggable: node.draggable(),
      name: `styled-${node.name() || 'node'}`,
      id: `styled-${nanoid()}`
    })
    
    // Reset node position within group
    node.x(0)
    node.y(0)
    node.rotation(0)
    node.scaleX(1)
    node.scaleY(1)
    
    // Apply opacity settings
    if (styles.opacity !== undefined) {
      group.opacity(styles.opacity)
    }
    
    // Apply blend mode
    if (styles.blendMode) {
      group.globalCompositeOperation(styles.blendMode as GlobalCompositeOperation)
    }
    
    // Apply effects in correct order for proper stacking
    
    // 1. Drop Shadow (behind everything)
    if (styles.dropShadow?.enabled) {
      this.applyDropShadow(node, styles.dropShadow, group)
    }
    
    // 2. Outer Glow
    if (styles.outerGlow?.enabled) {
      this.applyOuterGlow(node, styles.outerGlow, group)
    }
    
    // 3. Main node with stroke
    if (styles.stroke?.enabled) {
      this.applyStroke(node, styles.stroke, group)
    }
    
    // Add the main node - cast to proper type for Konva
    if (node instanceof Konva.Shape || node instanceof Konva.Group) {
      group.add(node)
    }
    
    // 4. Inner effects (on top of main node)
    if (styles.innerShadow?.enabled) {
      this.applyInnerShadow(node, styles.innerShadow, group)
    }
    
    if (styles.innerGlow?.enabled) {
      this.applyInnerGlow(node, styles.innerGlow, group)
    }
    
    if (styles.bevelEmboss?.enabled) {
      this.applyBevelEmboss(node, styles.bevelEmboss, group)
    }
    
    // Apply fill opacity if specified
    if (styles.fillOpacity !== undefined && node instanceof Konva.Shape) {
      node.opacity(styles.fillOpacity)
    }
    
    // Cache the effect group for performance
    this.cacheEffectGroup(group)
    
    // Emit event
    if (canvasObject) {
      this.typedEventBus.emit('object.styles.applied', {
        objectId: canvasObject.id,
        styles: styles as Record<string, unknown>,
        effectType: 'layer-styles'
      })
    }
    
    return group
  }
  
  /**
   * Apply drop shadow effect
   */
  private applyDropShadow(
    node: Konva.Node,
    style: DropShadowStyle,
    group: Konva.Group
  ): void {
    // Clone the node for shadow
    const shadow = node.clone()
    
    // Convert angle and distance to x/y offsets
    const angleRad = (style.angle * Math.PI) / 180
    const offsetX = Math.cos(angleRad) * style.distance
    const offsetY = Math.sin(angleRad) * style.distance
    
    shadow.x(offsetX)
    shadow.y(offsetY)
    
    // Apply shadow styling
    if (shadow instanceof Konva.Shape) {
      shadow.fill(style.color)
      shadow.stroke('transparent')
      shadow.opacity(style.opacity)
      
      // Apply blur
      shadow.filters([Konva.Filters.Blur])
      shadow.blurRadius(style.size)
      
      // Apply spread by scaling
      if (style.spread > 0) {
        const spreadScale = 1 + (style.spread / 100)
        shadow.scaleX(shadow.scaleX() * spreadScale)
        shadow.scaleY(shadow.scaleY() * spreadScale)
      }
    }
    
    // Add shadow behind everything
    group.add(shadow)
    shadow.moveToBottom()
  }
  
  /**
   * Apply outer glow effect
   */
  private applyOuterGlow(
    node: Konva.Node,
    style: OuterGlowStyle,
    group: Konva.Group
  ): void {
    // Clone node for glow
    const glow = node.clone()
    
    if (glow instanceof Konva.Shape) {
      glow.fill(style.color)
      glow.stroke(style.color)
      glow.strokeWidth(style.size)
      glow.opacity(style.opacity)
      
      // Apply blur for soft glow
      if (style.technique === 'softer') {
        glow.filters([Konva.Filters.Blur])
        glow.blurRadius(style.size * 0.5)
      }
      
      // Apply spread by scaling
      if (style.spread > 0) {
        const spreadScale = 1 + (style.spread / 100)
        glow.scaleX(glow.scaleX() * spreadScale)
        glow.scaleY(glow.scaleY() * spreadScale)
      }
    }
    
    group.add(glow)
    glow.moveToBottom()
  }
  
  /**
   * Apply stroke effect
   */
  private applyStroke(
    node: Konva.Node,
    style: StrokeStyle,
    _group: Konva.Group
  ): void {
    if (!(node instanceof Konva.Shape)) return
    
    // Apply stroke based on position
    let strokeWidth = style.size
    
    if (style.position === 'inside') {
      // For inside stroke, we'll use a clipping mask approach
      // This is a simplified version - full implementation would be more complex
      node.strokeWidth(strokeWidth)
      node.strokeScaleEnabled(false)
    } else if (style.position === 'outside') {
      // Double the stroke width for outside (Konva strokes are center-aligned)
      strokeWidth = style.size * 2
      node.strokeWidth(strokeWidth)
    } else {
      // Center position (default Konva behavior)
      node.strokeWidth(strokeWidth)
    }
    
    // Apply stroke fill
    if (style.fillType === 'color' && style.color) {
      node.stroke(style.color)
    } else if (style.fillType === 'gradient' && style.gradient) {
      const gradient = this.createGradient(node, style.gradient)
      node.stroke(gradient)
    }
    
    node.strokeEnabled(true)
    
    // Apply stroke opacity
    if (style.opacity !== undefined) {
      // Store original opacity to restore later
      const originalOpacity = node.opacity()
      node.opacity(originalOpacity * style.opacity)
    }
  }
  
  /**
   * Apply inner shadow effect
   */
  private applyInnerShadow(
    node: Konva.Node,
    style: InnerShadowStyle,
    group: Konva.Group
  ): void {
    // Inner shadow requires masking - create a mask from the original shape
    // const mask = node.clone() // Not used in current implementation
    
    // Create shadow shape
    const shadow = node.clone()
    
    // Convert angle and distance to offsets
    const angleRad = (style.angle * Math.PI) / 180
    const offsetX = Math.cos(angleRad) * style.distance
    const offsetY = Math.sin(angleRad) * style.distance
    
    shadow.x(offsetX)
    shadow.y(offsetY)
    
    if (shadow instanceof Konva.Shape) {
      shadow.fill(style.color)
      shadow.opacity(style.opacity)
      
      // Apply blur
      shadow.filters([Konva.Filters.Blur])
      shadow.blurRadius(style.size)
      
      // Use composite operation to create inner shadow
      shadow.globalCompositeOperation('source-atop')
    }
    
    group.add(shadow)
  }
  
  /**
   * Apply inner glow effect
   */
  private applyInnerGlow(
    node: Konva.Node,
    style: InnerGlowStyle,
    group: Konva.Group
  ): void {
    const glow = node.clone()
    
    if (glow instanceof Konva.Shape) {
      // For inner glow, we need to invert the effect
      if (style.source === 'edge') {
        glow.stroke(style.color)
        glow.strokeWidth(style.size)
        glow.fill('transparent')
      } else {
        // Center glow - use radial gradient
        const gradient = this.createRadialGradient(node, {
          type: 'radial',
          colors: [
            { color: style.color, position: 0 },
            { color: 'transparent', position: 1 }
          ]
        })
        glow.fill(gradient)
      }
      
      glow.opacity(style.opacity)
      
      // Apply blur for soft glow
      if (style.technique === 'softer') {
        glow.filters([Konva.Filters.Blur])
        glow.blurRadius(style.size * 0.3)
      }
      
      // Use composite operation for inner effect
      glow.globalCompositeOperation('source-atop')
    }
    
    group.add(glow)
  }
  
  /**
   * Apply bevel and emboss effect
   */
  private applyBevelEmboss(
    node: Konva.Node,
    style: BevelEmbossStyle,
    group: Konva.Group
  ): void {
    // Bevel/emboss is complex - using simplified version with highlights and shadows
    const highlight = node.clone()
    const shadow = node.clone()
    
    // Calculate light direction
    const angleRad = (style.angle * Math.PI) / 180
    const offset = style.size * 0.5
    
    if (highlight instanceof Konva.Shape) {
      highlight.fill(style.highlightColor)
      highlight.opacity(style.highlightOpacity)
      highlight.x(-Math.cos(angleRad) * offset)
      highlight.y(-Math.sin(angleRad) * offset)
      highlight.globalCompositeOperation('screen')
    }
    
    if (shadow instanceof Konva.Shape) {
      shadow.fill(style.shadowColor)
      shadow.opacity(style.shadowOpacity)
      shadow.x(Math.cos(angleRad) * offset)
      shadow.y(Math.sin(angleRad) * offset)
      shadow.globalCompositeOperation('multiply')
    }
    
    // Apply blur for smooth technique
    if (style.technique === 'smooth') {
      highlight.filters([Konva.Filters.Blur])
      highlight.blurRadius(style.soften)
      shadow.filters([Konva.Filters.Blur])
      shadow.blurRadius(style.soften)
    }
    
    group.add(shadow)
    group.add(highlight)
  }
  
  /**
   * Create gradient fill
   */
  private createGradient(node: Konva.Node, gradient: GradientStyle): string {
    const bounds = node.getClientRect()
    
    if (gradient.type === 'linear') {
      // Calculate gradient points based on angle
      const angle = (gradient.angle || 0) * Math.PI / 180
      const x1 = bounds.x + bounds.width / 2 - Math.cos(angle) * bounds.width / 2
      const y1 = bounds.y + bounds.height / 2 - Math.sin(angle) * bounds.height / 2
      const x2 = bounds.x + bounds.width / 2 + Math.cos(angle) * bounds.width / 2
      const y2 = bounds.y + bounds.height / 2 + Math.sin(angle) * bounds.height / 2
      
      return `linear-gradient(${x1},${y1},${x2},${y2},${
        gradient.colors.map(c => `${c.position},${c.color}`).join(',')
      })`
    } else {
      return this.createRadialGradient(node, gradient)
    }
  }
  
  /**
   * Create radial gradient
   */
  private createRadialGradient(node: Konva.Node, gradient: GradientStyle): string {
    const bounds = node.getClientRect()
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    const radius = Math.max(bounds.width, bounds.height) / 2 * (gradient.scale || 1)
    
    return `radial-gradient(${centerX},${centerY},0,${centerX},${centerY},${radius},${
      gradient.colors.map(c => `${c.position},${c.color}`).join(',')
    })`
  }
  
  /**
   * Cache effect group for performance
   */
  private cacheEffectGroup(group: Konva.Group): void {
    // Only cache if the group has complex effects
    const hasComplexEffects = group.children.length > 2 || 
      group.children.some(child => child.filters() && child.filters()!.length > 0)
    
    if (hasComplexEffects) {
      group.cache()
      // drawHitFromCache doesn't exist on Group, only on Shape
    }
  }
  
  /**
   * Remove layer styles from a node
   */
  removeStyles(styledGroup: Konva.Group): Konva.Node | null {
    // Find the original node (should be the last child without effects)
    const children = styledGroup.children
    let originalNode: Konva.Node | null = null
    
    // Look for the main node (not an effect)
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i]
      if (!child.name()?.includes('shadow') && 
          !child.name()?.includes('glow') &&
          !child.name()?.includes('highlight')) {
        originalNode = child
        break
      }
    }
    
    if (originalNode) {
      // Restore original position
      originalNode.x(styledGroup.x())
      originalNode.y(styledGroup.y())
      originalNode.rotation(styledGroup.rotation())
      originalNode.scaleX(styledGroup.scaleX())
      originalNode.scaleY(styledGroup.scaleY())
      
      // Clear cache
      styledGroup.clearCache()
      
      // Remove from parent before destroying
      const parent = styledGroup.getParent()
      if (parent) {
        parent.add(originalNode)
        styledGroup.destroy()
      }
    }
    
    return originalNode
  }
  
  /**
   * Update specific style property
   */
  updateStyle(
    styledGroup: Konva.Group,
    styleType: keyof LayerStyles,
    newStyle: unknown
  ): void {
    // This would require storing the original styles and recreating the group
    // For now, emit an event for the UI to handle
    this.typedEventBus.emit('object.styles.updated', {
      objectId: styledGroup.id(),
      styles: { [styleType]: newStyle },
      changes: { [styleType]: newStyle }
    })
  }
  
  /**
   * Get available blend modes
   */
  static getBlendModes(): Array<{ value: string; label: string }> {
    return [
      { value: 'normal', label: 'Normal' },
      { value: 'multiply', label: 'Multiply' },
      { value: 'screen', label: 'Screen' },
      { value: 'overlay', label: 'Overlay' },
      { value: 'darken', label: 'Darken' },
      { value: 'lighten', label: 'Lighten' },
      { value: 'color-dodge', label: 'Color Dodge' },
      { value: 'color-burn', label: 'Color Burn' },
      { value: 'hard-light', label: 'Hard Light' },
      { value: 'soft-light', label: 'Soft Light' },
      { value: 'difference', label: 'Difference' },
      { value: 'exclusion', label: 'Exclusion' },
      { value: 'hue', label: 'Hue' },
      { value: 'saturation', label: 'Saturation' },
      { value: 'color', label: 'Color' },
      { value: 'luminosity', label: 'Luminosity' }
    ]
  }
}

// Class is registered in ServiceContainer for dependency injection
// No singleton export - use container.get<EnhancedLayerStyles>('EnhancedLayerStyles') 