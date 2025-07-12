import Konva from 'konva'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { textToPathConverter } from '../services/TextToPathConverter'
import type { PathData, TextOptions } from '../services/TextToPathConverter'
import { getTypedEventBus } from '@/lib/events/core/TypedEventBus'
import { nanoid } from 'nanoid'

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
 * Enhanced TextWarp - Applies various warping effects to text objects
 * Uses proper text-to-path conversion for accurate results
 */
export class EnhancedTextWarp {
  private typedEventBus = getTypedEventBus()
  
  /**
   * Apply warp effect to a text object
   * Returns a Konva.Path object representing the warped text
   */
  async warpText(
    textObject: TextObject,
    warpStyle: WarpStyle,
    options: WarpOptions
  ): Promise<Konva.Path> {
    const textNode = textObject.node
    
    // Convert text to path with proper font metrics
    const textOptions: TextOptions = {
      fontFamily: textNode.fontFamily(),
      fontSize: textNode.fontSize(),
      letterSpacing: textNode.letterSpacing(),
      textAlign: textNode.align() as 'left' | 'center' | 'right'
    }
    
    const pathData = await textToPathConverter.convert(
      textNode.text(),
      textOptions
    )
    
    // Apply warp transformation
    const warpedPath = this.applyWarpTransform(pathData, warpStyle, options, textNode)
    
    // Create Konva path
    const path = new Konva.Path({
      data: warpedPath,
      fill: textNode.fill(),
      stroke: textNode.stroke(),
      strokeWidth: textNode.strokeWidth(),
      x: textNode.x(),
      y: textNode.y(),
      draggable: textNode.draggable(),
      opacity: textNode.opacity(),
      scaleX: textNode.scaleX(),
      scaleY: textNode.scaleY(),
      rotation: textNode.rotation(),
      // Store reference to original text
      name: `warped-text-${textObject.id}`,
      id: `warped-${nanoid()}`
    })
    
    // Copy other text attributes
    if (textNode.shadowColor()) {
      path.shadowColor(textNode.shadowColor())
      path.shadowBlur(textNode.shadowBlur())
      path.shadowOffsetX(textNode.shadowOffsetX())
      path.shadowOffsetY(textNode.shadowOffsetY())
      path.shadowOpacity(textNode.shadowOpacity())
    }
    
    // Emit event
    this.typedEventBus.emit('text.warped', {
      textId: textObject.id,
      warpStyle,
      warpOptions: { ...options }
    })
    
    return path
  }
  
  /**
   * Apply warp transformation to path data
   */
  private applyWarpTransform(
    pathData: PathData,
    style: WarpStyle,
    options: WarpOptions,
    textNode: Konva.Text
  ): string {
    const { bend } = options
    const bounds = pathData.bounds
    const width = bounds.width || textNode.width()
    const height = bounds.height || textNode.height()
    
    // Parse SVG path data and apply transformation
    const transformedPath = this.transformPath(
      pathData.data,
      (x: number, y: number) => {
        // Normalize coordinates
        const normalizedX = (x - bounds.x) / width
        const normalizedY = (y - bounds.y) / height
        
        // Apply warp based on style
        let newX = x
        let newY = y
        
        switch (style) {
          case WarpStyle.Arc:
            const arcResult = this.warpArcPoint(normalizedX, normalizedY, bend / 100, width, height)
            newX = arcResult.x + bounds.x
            newY = arcResult.y + bounds.y
            break
            
          case WarpStyle.Wave:
            const waveResult = this.warpWavePoint(normalizedX, normalizedY, bend / 100, width, height)
            newX = waveResult.x + bounds.x
            newY = waveResult.y + bounds.y
            break
            
          case WarpStyle.Bulge:
            const bulgeResult = this.warpBulgePoint(normalizedX, normalizedY, bend / 100, width, height)
            newX = bulgeResult.x + bounds.x
            newY = bulgeResult.y + bounds.y
            break
            
          case WarpStyle.Twist:
            const twistResult = this.warpTwistPoint(normalizedX, normalizedY, bend / 100, width, height)
            newX = twistResult.x + bounds.x
            newY = twistResult.y + bounds.y
            break
            
          // Add more warp styles as needed
          default:
            break
        }
        
        return { x: newX, y: newY }
      }
    )
    
    return transformedPath
  }
  
  /**
   * Transform SVG path by applying a point transformation function
   */
  private transformPath(
    pathData: string,
    transformPoint: (x: number, y: number) => { x: number; y: number }
  ): string {
    // Parse SVG path commands
    const commands = this.parsePathCommands(pathData)
    const transformedCommands: string[] = []
    
    let currentX = 0
    let currentY = 0
    
    for (const cmd of commands) {
      const type = cmd.type
      const values = cmd.values
      
      switch (type) {
        case 'M': // Move to
        case 'L': // Line to
          const point = transformPoint(values[0], values[1])
          transformedCommands.push(`${type} ${point.x} ${point.y}`)
          currentX = values[0]
          currentY = values[1]
          break
          
        case 'C': // Cubic bezier
          const cp1 = transformPoint(values[0], values[1])
          const cp2 = transformPoint(values[2], values[3])
          const end = transformPoint(values[4], values[5])
          transformedCommands.push(
            `${type} ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`
          )
          currentX = values[4]
          currentY = values[5]
          break
          
        case 'Q': // Quadratic bezier
          const qcp = transformPoint(values[0], values[1])
          const qend = transformPoint(values[2], values[3])
          transformedCommands.push(
            `${type} ${qcp.x} ${qcp.y} ${qend.x} ${qend.y}`
          )
          currentX = values[2]
          currentY = values[3]
          break
          
        case 'Z': // Close path
          transformedCommands.push(type)
          break
          
        // Handle relative commands by converting to absolute
        case 'm':
        case 'l':
          const relPoint = transformPoint(currentX + values[0], currentY + values[1])
          transformedCommands.push(`${type.toUpperCase()} ${relPoint.x} ${relPoint.y}`)
          currentX += values[0]
          currentY += values[1]
          break
          
        // Add more command types as needed
      }
    }
    
    return transformedCommands.join(' ')
  }
  
  /**
   * Parse SVG path commands into structured data
   */
  private parsePathCommands(pathData: string): Array<{ type: string; values: number[] }> {
    const commands: Array<{ type: string; values: number[] }> = []
    const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g
    let match
    
    while ((match = regex.exec(pathData)) !== null) {
      const type = match[1]
      const valuesStr = match[2].trim()
      const values = valuesStr
        .split(/[\s,]+/)
        .filter(v => v.length > 0)
        .map(v => parseFloat(v))
      
      commands.push({ type, values })
    }
    
    return commands
  }
  
  // Warp transformation functions
  
  private warpArcPoint(
    normalizedX: number,
    normalizedY: number,
    bendAmount: number,
    width: number,
    height: number
  ): { x: number; y: number } {
    // Arc warp - bend text along an arc
    const angle = (normalizedX - 0.5) * Math.PI * bendAmount
    const radius = width / (2 * Math.sin(Math.abs(bendAmount * Math.PI / 2)))
    
    const x = width * normalizedX
    const y = height * normalizedY - radius + radius * Math.cos(angle)
    
    return { x, y }
  }
  
  private warpWavePoint(
    normalizedX: number,
    normalizedY: number,
    bendAmount: number,
    width: number,
    height: number
  ): { x: number; y: number } {
    // Wave warp - create sine wave effect
    const waveCount = 2
    const amplitude = bendAmount * height * 0.2
    
    const x = width * normalizedX
    const y = height * normalizedY + amplitude * Math.sin(normalizedX * waveCount * Math.PI * 2)
    
    return { x, y }
  }
  
  private warpBulgePoint(
    normalizedX: number,
    normalizedY: number,
    bendAmount: number,
    width: number,
    height: number
  ): { x: number; y: number } {
    // Bulge warp - expand from center
    const centerX = 0.5
    const centerY = 0.5
    const distX = normalizedX - centerX
    const distY = normalizedY - centerY
    const dist = Math.sqrt(distX * distX + distY * distY)
    
    // Bulge factor based on distance from center
    const bulgeFactor = 1 + bendAmount * (1 - dist * 2)
    
    const x = width * (centerX + distX * bulgeFactor)
    const y = height * (centerY + distY * bulgeFactor)
    
    return { x, y }
  }
  
  private warpTwistPoint(
    normalizedX: number,
    normalizedY: number,
    bendAmount: number,
    width: number,
    height: number
  ): { x: number; y: number } {
    // Twist warp - rotate based on vertical position
    const angle = normalizedY * bendAmount * Math.PI
    const centerX = 0.5
    
    const relX = normalizedX - centerX
    const newRelX = relX * Math.cos(angle)
    
    const x = width * (centerX + newRelX)
    const y = height * normalizedY
    
    return { x, y }
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
  
  /**
   * Create a preview of the warp effect
   */
  async createPreview(
    text: string,
    fontFamily: string,
    fontSize: number,
    warpStyle: WarpStyle,
    bendAmount: number
  ): Promise<string> {
    // Create temporary text object
    const tempText = new Konva.Text({
      text,
      fontFamily,
      fontSize,
      fill: '#000'
    })
    
    const tempObject: TextObject = {
      id: 'preview',
      type: 'text',
      name: 'Preview',
      x: 0,
      y: 0,
      width: 200,
      height: 50,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 0,
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      filters: [],
      adjustments: [],
      data: {
        content: '',
        fontSize: 16,
        font: 'Arial',
        color: '#000000',
        align: 'left'
      },
      node: tempText
    }
    
    // Apply warp
    const warpedPath = await this.warpText(tempObject, warpStyle, {
      style: warpStyle,
      bend: bendAmount
    })
    
    // Generate preview image
    const stage = new Konva.Stage({
      container: document.createElement('div'),
      width: 200,
      height: 100
    })
    
    const layer = new Konva.Layer()
    stage.add(layer)
    layer.add(warpedPath)
    
    const dataURL = stage.toDataURL()
    stage.destroy()
    
    return dataURL
  }
}

// Export singleton instance
export const enhancedTextWarp = new EnhancedTextWarp() 