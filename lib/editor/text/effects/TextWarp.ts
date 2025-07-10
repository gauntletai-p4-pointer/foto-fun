import Konva from 'konva'
import type { CanvasObject } from '@/lib/editor/canvas/types'

// Type for text objects in our system
type TextObject = CanvasObject & {
  type: 'text' | 'verticalText'
  node: Konva.Text
}

// Warp style types
export enum WarpStyle {
  Arc = 'arc',
  ArcLower = 'arcLower',
  ArcUpper = 'arcUpper',
  Bulge = 'bulge',
  Wave = 'wave',
  Flag = 'flag',
  Fish = 'fish',
  Rise = 'rise',
  FishEye = 'fishEye',
  Inflate = 'inflate',
  Squeeze = 'squeeze',
  Twist = 'twist'
}

// Warp options interface
export interface WarpOptions {
  style: WarpStyle
  bend: number // -100 to 100, controls the amount of warping
  horizontalDistortion?: number // -100 to 100
  verticalDistortion?: number // -100 to 100
  direction?: 'horizontal' | 'vertical'
}

/**
 * TextWarp - Applies various warping effects to text objects
 * Similar to Photoshop's Text Warp feature
 * Uses Konva's path and transformation capabilities
 */
export class TextWarp {
  /**
   * Apply warp effect to a text object
   * Returns a Konva.Path object representing the warped text
   */
  static applyWarp(textObject: TextObject, options: WarpOptions): Konva.Path | null {
    const { style, bend } = options
    const textNode = textObject.node
    
    // Get text properties
    const text = textNode.text()
    const fontSize = textNode.fontSize()
    const fontFamily = textNode.fontFamily()
    
    // Convert text to path data (simplified - in production would use proper text-to-path conversion)
    const pathData = this.textToPath(text, fontSize, fontFamily)
    if (!pathData) return null
    
    // Apply warp transformation based on style
    let warpedPath: string
    switch (style) {
      case WarpStyle.Arc:
        warpedPath = this.warpArc(pathData, bend, textNode.width())
        break
      case WarpStyle.ArcLower:
        warpedPath = this.warpArcLower(pathData, bend, textNode.width())
        break
      case WarpStyle.ArcUpper:
        warpedPath = this.warpArcUpper(pathData, bend, textNode.width())
        break
      case WarpStyle.Bulge:
        warpedPath = this.warpBulge(pathData, bend, textNode.width(), textNode.height())
        break
      case WarpStyle.Wave:
        warpedPath = this.warpWave(pathData, bend, textNode.width())
        break
      case WarpStyle.Flag:
        warpedPath = this.warpFlag(pathData, bend, textNode.width())
        break
      case WarpStyle.Fish:
        warpedPath = this.warpFish(pathData, bend, textNode.width(), textNode.height())
        break
      case WarpStyle.Rise:
        warpedPath = this.warpRise(pathData, bend, textNode.width())
        break
      case WarpStyle.FishEye:
        warpedPath = this.warpFishEye(pathData, bend, textNode.width(), textNode.height())
        break
      case WarpStyle.Inflate:
        warpedPath = this.warpInflate(pathData, bend, textNode.width(), textNode.height())
        break
      case WarpStyle.Squeeze:
        warpedPath = this.warpSqueeze(pathData, bend, textNode.width(), textNode.height())
        break
      case WarpStyle.Twist:
        warpedPath = this.warpTwist(pathData, bend, textNode.width(), textNode.height())
        break
      default:
        warpedPath = pathData
    }
    
    // Create path object from warped data
    const path = new Konva.Path({
      data: warpedPath,
      fill: textNode.fill(),
      stroke: textNode.stroke(),
      strokeWidth: textNode.strokeWidth(),
      x: textNode.x(),
      y: textNode.y(),
      draggable: textNode.draggable(),
      // Copy other relevant properties
      opacity: textNode.opacity(),
      scaleX: textNode.scaleX(),
      scaleY: textNode.scaleY(),
      rotation: textNode.rotation()
    })
    
    return path
  }
  
  /**
   * Convert text to path data
   * In production, this would use proper font metrics and glyph conversion
   */
  private static textToPath(text: string, fontSize: number, fontFamily: string): string | null {
    // Simplified implementation - creates a baseline path
    // In production, would use canvas measureText or font library
    const estimatedWidth = text.length * fontSize * 0.6
    const height = fontSize
    
    // Create a simple path representing the text
    // This is a placeholder - real implementation would convert actual glyphs
    return `M 0 ${height/2} L ${estimatedWidth} ${height/2}`
  }
  
  /**
   * Arc warp - bends text along an arc
   */
  private static warpArc(pathData: string, bend: number, width: number): string {
    // Calculate arc parameters
    const bendAmount = (bend / 100) * Math.PI / 2 // Convert to radians
    if (Math.abs(bendAmount) < 0.01) return pathData // No significant bend
    
    const radius = width / (2 * Math.sin(Math.abs(bendAmount)))
    const centerY = bend > 0 ? radius : -radius
    
    // Create arc path
    const startAngle = -Math.abs(bendAmount)
    const endAngle = Math.abs(bendAmount)
    
    // Calculate start and end points
    const startX = width / 2 + radius * Math.sin(startAngle)
    const startY = centerY - radius * Math.cos(startAngle)
    const endX = width / 2 + radius * Math.sin(endAngle)
    const endY = centerY - radius * Math.cos(endAngle)
    
    // Create arc path command
    const largeArcFlag = Math.abs(bendAmount) > Math.PI / 2 ? 1 : 0
    const sweepFlag = bend > 0 ? 0 : 1
    
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`
  }
  
  /**
   * Arc Lower - bends only the bottom of the text
   */
  private static warpArcLower(pathData: string, bend: number, width: number): string {
    // Similar to arc but affects only lower portion
    const bendAmount = (bend / 100) * Math.PI / 4
    if (Math.abs(bendAmount) < 0.01) return pathData
    
    // Create a quadratic curve for the bottom
    return `M 0 0 L ${width} 0 Q ${width/2} ${bend * 0.5} 0 0`
  }
  
  /**
   * Arc Upper - bends only the top of the text
   */
  private static warpArcUpper(pathData: string, bend: number, width: number): string {
    // Similar to arc but affects only upper portion
    const bendAmount = (bend / 100) * Math.PI / 4
    if (Math.abs(bendAmount) < 0.01) return pathData
    
    // Create a quadratic curve for the top
    return `M 0 0 Q ${width/2} ${-bend * 0.5} ${width} 0`
  }
  
  /**
   * Bulge - makes text appear to bulge outward
   */
  private static warpBulge(pathData: string, bend: number, width: number, height: number): string {
    const bulgeAmount = bend / 100
    const centerX = width / 2
    const centerY = height / 2
    
    // Create a path that bulges in the middle
    return `M 0 ${centerY} Q ${centerX} ${centerY + height * bulgeAmount} ${width} ${centerY}`
  }
  
  /**
   * Wave - creates a wave effect
   */
  private static warpWave(pathData: string, bend: number, width: number): string {
    const waveCount = 2
    const amplitude = (bend / 100) * 20
    const points: string[] = []
    
    for (let i = 0; i <= 20; i++) {
      const x = (i / 20) * width
      const y = amplitude * Math.sin((i / 20) * waveCount * Math.PI * 2)
      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    }
    
    return points.join(' ')
  }
  
  /**
   * Flag - creates a waving flag effect
   */
  private static warpFlag(pathData: string, bend: number, width: number): string {
    // Similar to wave but with decreasing amplitude
    const amplitude = (bend / 100) * 20
    const points: string[] = []
    
    for (let i = 0; i <= 20; i++) {
      const x = (i / 20) * width
      const dampening = 1 - (i / 20) * 0.7 // Decrease amplitude towards the end
      const y = amplitude * dampening * Math.sin((i / 20) * Math.PI * 2)
      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    }
    
    return points.join(' ')
  }
  
  /**
   * Fish - creates a fish-like distortion
   */
  private static warpFish(pathData: string, bend: number, width: number, height: number): string {
    const fishAmount = bend / 100
    
    // Create fish-shaped path
    return `M 0 ${height/2} Q ${width * 0.25} ${height/2 - height * fishAmount} ${width/2} ${height/2} Q ${width * 0.75} ${height/2 + height * fishAmount} ${width} ${height/2}`
  }
  
  /**
   * Rise - makes text appear to rise
   */
  private static warpRise(pathData: string, bend: number, width: number): string {
    const riseAmount = (bend / 100) * 30
    
    // Create ascending path
    return `M 0 ${riseAmount} L ${width} ${-riseAmount}`
  }
  
  /**
   * Fish Eye - creates a lens distortion effect
   */
  private static warpFishEye(pathData: string, bend: number, width: number, height: number): string {
    const distortion = bend / 100
    const centerX = width / 2
    const centerY = height / 2
    
    // Create circular distortion
    const radius = Math.min(width, height) / 2
    return `M ${centerX - radius} ${centerY} A ${radius} ${radius * (1 + distortion)} 0 0 1 ${centerX + radius} ${centerY}`
  }
  
  /**
   * Inflate - makes text appear inflated
   */
  private static warpInflate(pathData: string, bend: number, width: number, height: number): string {
    const inflation = (bend / 100) * 0.5
    
    // Create inflated rectangle path
    return `M 0 ${height/2} Q ${width/4} ${height/2 - height * inflation} ${width/2} ${height/2} Q ${width * 3/4} ${height/2 + height * inflation} ${width} ${height/2}`
  }
  
  /**
   * Squeeze - compresses text in the middle
   */
  private static warpSqueeze(pathData: string, bend: number, width: number, height: number): string {
    const squeeze = (bend / 100) * 0.5
    
    // Create squeezed path
    return `M 0 ${height/2} Q ${width/2} ${height/2 * (1 - squeeze)} ${width} ${height/2}`
  }
  
  /**
   * Twist - creates a twisting effect
   */
  private static warpTwist(pathData: string, bend: number, width: number, height: number): string {
    const twistAmount = (bend / 100) * Math.PI
    const points: string[] = []
    
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width
      const rotation = (i / 10) * twistAmount
      const y = height / 2 + Math.sin(rotation) * height / 4
      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    }
    
    return points.join(' ')
  }
  
  /**
   * Create a preview of the warp effect
   */
  static createPreview(textObject: TextObject, options: WarpOptions): string {
    // Generate a small preview using canvas
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 100
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return ''
    
    // Draw preview of warped text
    ctx.fillStyle = '#000'
    ctx.font = '16px Arial'
    ctx.fillText(`${options.style} preview`, 10, 50)
    
    return canvas.toDataURL()
  }
  
  /**
   * Get all available warp styles with descriptions
   */
  static getWarpStyles(): Array<{ style: WarpStyle; name: string; description: string }> {
    return [
      { style: WarpStyle.Arc, name: 'Arc', description: 'Bend text along an arc' },
      { style: WarpStyle.ArcLower, name: 'Arc Lower', description: 'Bend bottom of text' },
      { style: WarpStyle.ArcUpper, name: 'Arc Upper', description: 'Bend top of text' },
      { style: WarpStyle.Bulge, name: 'Bulge', description: 'Make text bulge outward' },
      { style: WarpStyle.Wave, name: 'Wave', description: 'Create wave effect' },
      { style: WarpStyle.Flag, name: 'Flag', description: 'Waving flag effect' },
      { style: WarpStyle.Fish, name: 'Fish', description: 'Fish-like distortion' },
      { style: WarpStyle.Rise, name: 'Rise', description: 'Make text appear to rise' },
      { style: WarpStyle.FishEye, name: 'Fish Eye', description: 'Lens distortion effect' },
      { style: WarpStyle.Inflate, name: 'Inflate', description: 'Inflate text' },
      { style: WarpStyle.Squeeze, name: 'Squeeze', description: 'Compress in middle' },
      { style: WarpStyle.Twist, name: 'Twist', description: 'Twist text' },
    ]
  }
} 