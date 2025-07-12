import Konva from 'konva'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { textToPathConverter } from '../services/TextToPathConverter'
import type { PathData, TextOptions } from '../services/TextToPathConverter'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { nanoid } from 'nanoid'

// Type for text objects in our system
interface TextObject extends CanvasObject {
  type: 'text'
  data: {
    content: string
    font: string
    fontSize: number
    color: string
    align: 'left' | 'center' | 'right'
    lineHeight?: number
    letterSpacing?: number
    direction?: 'horizontal' | 'vertical'
    isWarped?: boolean
    warpStyle?: string | null
    bendAmount?: number
  }
}

interface TextWarpConfig {
  intensity?: number
  quality?: 'low' | 'medium' | 'high'
  realtime?: boolean
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
 * Enhanced text warp effects with proper dependency injection
 * No longer extends Effect - standalone service class
 */
export class EnhancedTextWarp {
  private config: TextWarpConfig
  private typedEventBus: TypedEventBus

  constructor(
    typedEventBus: TypedEventBus,
    config: TextWarpConfig = {}
  ) {
    this.typedEventBus = typedEventBus
    this.config = {
      intensity: 1.0,
      quality: 'high',
      realtime: true,
      ...config
    }
  }
  
  /**
   * Apply warp effect to a text object
   * Returns a Konva.Path object representing the warped text
   */
  async warpText(
    textObject: TextObject,
    warpStyle: WarpStyle,
    options: WarpOptions
  ): Promise<Konva.Path> {
    // Get text properties from the object data
    const textData = textObject.data
    
    // Convert text to path with proper font metrics
    const textOptions: TextOptions = {
      fontFamily: textData.font,
      fontSize: textData.fontSize,
      letterSpacing: 0,
      textAlign: textData.align as 'left' | 'center' | 'right'
    }
    
    const pathData = await textToPathConverter.convert(
      textData.content,
      textOptions
    )
    
    // Apply warp transformation
    const warpedPath = this.applyWarpTransform(pathData, warpStyle, options, textObject)
    
    // Create Konva path
    const path = new Konva.Path({
      data: warpedPath,
      fill: textData.color,
      x: textObject.x,
      y: textObject.y,
      draggable: true,
      opacity: textObject.opacity,
      scaleX: textObject.scaleX,
      scaleY: textObject.scaleY,
      rotation: textObject.rotation,
      // Store reference to original text
      name: `warped-text-${textObject.id}`,
      id: `warped-${nanoid()}`
    })
    
    // Emit event
    this.typedEventBus.emit('text.warped', {
      textId: textObject.id,
      warpType: warpStyle,
      parameters: { ...options }
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
    textObject: TextObject
  ): string {
    const { bend } = options
    const bounds = pathData.bounds
    const width = bounds.width || textObject.width
    const height = bounds.height || textObject.height
    
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
  
  // Warp point calculation methods
  private warpArcPoint(
    normalizedX: number,
    normalizedY: number,
    bendAmount: number,
    width: number,
    height: number
  ): { x: number; y: number } {
    // Arc warp - bend text along an arc
    const centerX = 0.5
    const distanceFromCenter = normalizedX - centerX
    const arcOffset = bendAmount * distanceFromCenter * distanceFromCenter
    
    const x = width * normalizedX
    const y = height * (normalizedY + arcOffset)
    
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
    const waveOffset = bendAmount * Math.sin(normalizedX * Math.PI * 2) * 0.1
    
    const x = width * normalizedX
    const y = height * (normalizedY + waveOffset)
    
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
    // Twist warp - rotate based on distance from center
    const centerX = 0.5
    const centerY = 0.5
    const distX = normalizedX - centerX
    const distY = normalizedY - centerY
    const dist = Math.sqrt(distX * distX + distY * distY)
    
    const angle = bendAmount * dist * Math.PI
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    
    const rotatedX = distX * cos - distY * sin
    const rotatedY = distX * sin + distY * cos
    
    const x = width * (centerX + rotatedX)
    const y = height * (centerY + rotatedY)
    
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
        content: text,
        fontSize: fontSize,
        font: fontFamily,
        color: '#000000',
        align: 'left'
      }
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