import { Brush } from 'lucide-react'
import { ObjectDrawingTool } from '../base/ObjectDrawingTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'
import type { CanvasObject, ImageData as ObjectImageData } from '@/lib/editor/objects/types'
import { TOOL_IDS } from '@/constants'
import { BrushEngine } from '../engines/BrushEngine'

/**
 * Object-based Brush Tool
 * Paints on existing image objects or creates new paint objects
 */
export class BrushTool extends ObjectDrawingTool {
  id = TOOL_IDS.BRUSH
  name = 'Brush Tool'
  icon = Brush
  cursor = 'none' // Custom cursor
  shortcut = 'B'
  
  // Brush engine for generating stamps
  private brushEngine: BrushEngine
  
  // Current brush settings
  private brushColor = { r: 0, g: 0, b: 0 }
  private brushSize = 20
  private brushHardness = 100
  private brushOpacity = 1
  private brushFlow = 1
  private brushSpacing = 0.25
  private blendMode: GlobalCompositeOperation = 'source-over'
  
  // Stroke tracking
  private lastPoint: Point | null = null
  private distance = 0
  
  // Brush stamp cache
  private currentBrushStamp: ImageData | null = null
  private lastBrushSize = 0
  
  constructor() {
    super()
    this.brushEngine = new BrushEngine()
  }
  
  protected setupTool(): void {
    // Load settings from options
    const color = (this.getOption('color') as string) || '#000000'
    this.setBrushColor(color)
    
    this.brushSize = (this.getOption('size') as number) || 20
    this.brushHardness = (this.getOption('hardness') as number) || 100
    this.brushOpacity = ((this.getOption('opacity') as number) || 100) / 100
    this.brushFlow = ((this.getOption('flow') as number) || 100) / 100
    this.brushSpacing = ((this.getOption('spacing') as number) || 25) / 100
    this.blendMode = (this.getOption('blendMode') as GlobalCompositeOperation) || 'source-over'
    
    // Reset brush engine
    this.brushEngine.resetSmoothing()
    
    // Update cursor
    this.updateCursor()
  }
  
  protected cleanupTool(): void {
    this.currentBrushStamp = null
    this.lastPoint = null
  }
  
  onMouseDown(event: ToolEvent): void {
    super.onMouseDown(event)
    
    // Start stroke
    this.lastPoint = event.point
    this.distance = 0
    
    // Apply initial paint
    this.applyBrush(event.point, event.pressure || 1)
  }
  
  onMouseMove(event: ToolEvent): void {
    super.onMouseMove(event)
    
    if (!this.isDrawing || !this.lastPoint) return
    
    // Calculate distance for spacing
    const dx = event.point.x - this.lastPoint.x
    const dy = event.point.y - this.lastPoint.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance === 0) return
    
    // Apply smoothing
    const smoothedPoint = this.brushEngine.smoothPoint(
      event.point,
      this.lastPoint,
      (this.getOption('smoothing') as number) || 0
    )
    
    // Calculate spacing
    const spacing = this.brushSize * this.brushSpacing
    const steps = Math.floor((this.distance + distance) / spacing)
    
    if (steps > 0) {
      // Interpolate between points
      for (let i = 0; i < steps; i++) {
        const t = (i + 1) / steps
        const x = this.lastPoint.x + (smoothedPoint.x - this.lastPoint.x) * t
        const y = this.lastPoint.y + (smoothedPoint.y - this.lastPoint.y) * t
        
        this.applyBrush({ x, y }, event.pressure || 1)
      }
      
      this.distance = (this.distance + distance) % spacing
    } else {
      this.distance += distance
    }
    
    this.lastPoint = smoothedPoint
  }
  
  onMouseUp(event: ToolEvent): void {
    super.onMouseUp(event)
    this.lastPoint = null
  }
  
  /**
   * Apply brush at a point
   */
  private applyBrush(point: Point, pressure: number): void {
    const object = this.getDrawingObject()
    if (!object || object.type !== 'image') return
    
    // Calculate dynamic parameters
    const size = this.calculateBrushSize(pressure)
    const opacity = this.calculateOpacity(pressure)
    const flow = this.calculateFlow(pressure)
    
    // Generate or get cached brush stamp
    if (!this.currentBrushStamp || this.lastBrushSize !== size) {
      this.currentBrushStamp = this.brushEngine.generateBrushTip(
        size,
        this.brushHardness
      )
      this.lastBrushSize = size
    }
    
    // Draw on object
    this.drawOnObject(object, (ctx) => {
      // Convert point from canvas space to object space
      const localX = point.x - object.x
      const localY = point.y - object.y
      
      // Set composite operation
      ctx.globalCompositeOperation = this.blendMode
      ctx.globalAlpha = opacity * flow
      
      // Create temporary canvas for brush stamp
      const stampCanvas = document.createElement('canvas')
      stampCanvas.width = this.currentBrushStamp!.width
      stampCanvas.height = this.currentBrushStamp!.height
      const stampCtx = stampCanvas.getContext('2d')!
      
      // Apply color to stamp
      const stampData = stampCtx.createImageData(
        this.currentBrushStamp!.width,
        this.currentBrushStamp!.height
      )
      
      for (let i = 0; i < this.currentBrushStamp!.data.length; i += 4) {
        stampData.data[i] = this.brushColor.r
        stampData.data[i + 1] = this.brushColor.g
        stampData.data[i + 2] = this.brushColor.b
        stampData.data[i + 3] = this.currentBrushStamp!.data[i + 3]
      }
      
      stampCtx.putImageData(stampData, 0, 0)
      
      // Draw stamp
      ctx.drawImage(
        stampCanvas,
        localX - size / 2,
        localY - size / 2
      )
    })
  }
  
  /**
   * Calculate dynamic brush size based on pressure
   */
  private calculateBrushSize(pressure: number): number {
    const usePressure = this.getOption('pressureSensitivity.size') as boolean
    if (usePressure) {
      return Math.max(1, this.brushSize * pressure)
    }
    return this.brushSize
  }
  
  /**
   * Calculate dynamic opacity based on pressure
   */
  private calculateOpacity(pressure: number): number {
    const usePressure = this.getOption('pressureSensitivity.opacity') as boolean
    if (usePressure) {
      return this.brushOpacity * pressure
    }
    return this.brushOpacity
  }
  
  /**
   * Calculate dynamic flow based on pressure
   */
  private calculateFlow(pressure: number): number {
    const usePressure = this.getOption('pressureSensitivity.flow') as boolean
    if (usePressure) {
      return this.brushFlow * pressure
    }
    return this.brushFlow
  }
  
  /**
   * Set brush color from hex string
   */
  private setBrushColor(hexColor: string): void {
    const hex = hexColor.replace('#', '')
    this.brushColor = {
      r: parseInt(hex.substr(0, 2), 16),
      g: parseInt(hex.substr(2, 2), 16),
      b: parseInt(hex.substr(4, 2), 16)
    }
  }
  
  /**
   * Update custom cursor
   */
  private updateCursor(): void {
    const cursorCanvas = this.brushEngine.createBrushCursor({
      size: this.brushSize,
      hardness: this.brushHardness,
      opacity: this.brushOpacity * 100,
      flow: this.brushFlow * 100,
      spacing: this.brushSpacing * 100,
      smoothing: (this.getOption('smoothing') as number) || 0,
      pressureSensitivity: {
        size: this.getOption('pressureSensitivity.size') as boolean || false,
        opacity: this.getOption('pressureSensitivity.opacity') as boolean || false,
        flow: this.getOption('pressureSensitivity.flow') as boolean || false
      }
    })
    const cursorUrl = cursorCanvas.toDataURL()
    
    // Update cursor style
    const canvas = this.getCanvas()
    // @ts-expect-error - getStage method exists on implementation
    const stage = canvas.getStage?.() || canvas.konvaStage
    if (stage && stage.container()) {
      const container = stage.container()
      container.style.cursor = `url(${cursorUrl}) ${cursorCanvas.width / 2} ${cursorCanvas.height / 2}, crosshair`
    }
  }
  
  /**
   * Handle option changes
   */
  protected onOptionChange(key: string, value: unknown): void {
    super.onOptionChange(key, value)
    
    switch (key) {
      case 'color':
        this.setBrushColor(value as string)
        break
      case 'size':
        this.brushSize = value as number
        this.currentBrushStamp = null
        this.updateCursor()
        break
      case 'hardness':
        this.brushHardness = value as number
        this.currentBrushStamp = null
        this.updateCursor()
        break
      case 'opacity':
        this.brushOpacity = (value as number) / 100
        break
      case 'flow':
        this.brushFlow = (value as number) / 100
        break
      case 'spacing':
        this.brushSpacing = (value as number) / 100
        break
      case 'blendMode':
        this.blendMode = value as GlobalCompositeOperation
        break
    }
  }
  
  // Tool options configuration
  static options = [
    {
      id: 'size',
      type: 'slider' as const,
      label: 'Size',
      min: 1,
      max: 500,
      default: 20,
      step: 1
    },
    {
      id: 'hardness',
      type: 'slider' as const,
      label: 'Hardness',
      min: 0,
      max: 100,
      default: 100,
      step: 1
    },
    {
      id: 'opacity',
      type: 'slider' as const,
      label: 'Opacity',
      min: 0,
      max: 100,
      default: 100,
      step: 1
    },
    {
      id: 'flow',
      type: 'slider' as const,
      label: 'Flow',
      min: 0,
      max: 100,
      default: 100,
      step: 1
    },
    {
      id: 'spacing',
      type: 'slider' as const,
      label: 'Spacing',
      min: 1,
      max: 200,
      default: 25,
      step: 1
    },
    {
      id: 'smoothing',
      type: 'slider' as const,
      label: 'Smoothing',
      min: 0,
      max: 100,
      default: 0,
      step: 1
    },
    {
      id: 'color',
      type: 'color' as const,
      label: 'Color',
      default: '#000000'
    },
    {
      id: 'blendMode',
      type: 'select' as const,
      label: 'Blend Mode',
      options: [
        { value: 'source-over', label: 'Normal' },
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
        { value: 'exclusion', label: 'Exclusion' }
      ],
      default: 'source-over'
    },
    {
      id: 'pressureSensitivity',
      type: 'group' as const,
      label: 'Pressure Sensitivity',
      children: [
        {
          id: 'size',
          type: 'checkbox' as const,
          label: 'Size',
          default: true
        },
        {
          id: 'opacity',
          type: 'checkbox' as const,
          label: 'Opacity',
          default: false
        },
        {
          id: 'flow',
          type: 'checkbox' as const,
          label: 'Flow',
          default: false
        }
      ]
    }
  ]
}

// Export singleton instance
export const brushTool = new BrushTool() 