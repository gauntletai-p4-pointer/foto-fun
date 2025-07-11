import { Eraser } from 'lucide-react'
import { ObjectDrawingTool } from '../base/ObjectDrawingTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { TOOL_IDS } from '@/constants'
import { BrushEngine } from '../engines/BrushEngine'

/**
 * Object-based Eraser Tool
 * Erases from existing image objects
 */
export class EraserTool extends ObjectDrawingTool {
  id = TOOL_IDS.ERASER
  name = 'Eraser Tool'
  icon = Eraser
  cursor = 'none' // Custom cursor
  shortcut = 'E'
  
  // Brush engine for generating stamps
  private brushEngine: BrushEngine
  
  // Eraser settings
  private eraserSize = 20
  private eraserHardness = 100
  private eraserOpacity = 1
  private eraserFlow = 1
  private eraserSpacing = 0.25
  
  // Stroke tracking
  private lastPoint: Point | null = null
  private distance = 0
  
  // Eraser stamp cache
  private currentEraserStamp: ImageData | null = null
  private lastEraserSize = 0
  
  constructor() {
    super()
    this.brushEngine = new BrushEngine()
  }
  
  protected setupTool(): void {
    // Load settings from options
    this.eraserSize = (this.getOption('size') as number) || 20
    this.eraserHardness = (this.getOption('hardness') as number) || 100
    this.eraserOpacity = ((this.getOption('opacity') as number) || 100) / 100
    this.eraserFlow = ((this.getOption('flow') as number) || 100) / 100
    this.eraserSpacing = ((this.getOption('spacing') as number) || 25) / 100
    
    // Reset brush engine
    this.brushEngine.resetSmoothing()
    
    // Update cursor
    this.updateCursor()
  }
  
  protected cleanupTool(): void {
    this.currentEraserStamp = null
    this.lastPoint = null
  }
  
  onMouseDown(event: ToolEvent): void {
    // Don't call super - we don't want to create new objects
    this.lastMousePosition = event.point
    
    // Only erase on existing objects
    const target = this.getTargetObject()
    if (!target || target.type !== 'image') {
      return
    }
    
    this.currentDrawingObject = target.id
    this.isDrawing = true
    
    // Start stroke
    this.lastPoint = event.point
    this.distance = 0
    
    // Apply initial erase
    this.applyEraser(event.point, event.pressure || 1)
  }
  
  onMouseMove(event: ToolEvent): void {
    this.lastMousePosition = event.point
    
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
    const spacing = this.eraserSize * this.eraserSpacing
    const steps = Math.floor((this.distance + distance) / spacing)
    
    if (steps > 0) {
      // Interpolate between points
      for (let i = 0; i < steps; i++) {
        const t = (i + 1) / steps
        const x = this.lastPoint.x + (smoothedPoint.x - this.lastPoint.x) * t
        const y = this.lastPoint.y + (smoothedPoint.y - this.lastPoint.y) * t
        
        this.applyEraser({ x, y }, event.pressure || 1)
      }
      
      this.distance = (this.distance + distance) % spacing
    } else {
      this.distance += distance
    }
    
    this.lastPoint = smoothedPoint
  }
  
  onMouseUp(_event: ToolEvent): void {
    this.stopDrawing()
    this.lastPoint = null
  }
  
  /**
   * Apply eraser at a point
   */
  private applyEraser(point: Point, pressure: number): void {
    const object = this.getDrawingObject()
    if (!object || object.type !== 'image') return
    
    // Calculate dynamic parameters
    const size = this.calculateEraserSize(pressure)
    const opacity = this.calculateOpacity(pressure)
    const flow = this.calculateFlow(pressure)
    
    // Generate or get cached eraser stamp
    if (!this.currentEraserStamp || this.lastEraserSize !== size) {
      this.currentEraserStamp = this.brushEngine.generateBrushTip(
        size,
        this.eraserHardness
      )
      this.lastEraserSize = size
    }
    
    // Erase from object
    this.drawOnObject(object, (ctx) => {
      // Convert point from canvas space to object space
      const localX = point.x - object.x
      const localY = point.y - object.y
      
      // Save composite operation
      const prevOperation = ctx.globalCompositeOperation
      
      // Set eraser composite operation
      ctx.globalCompositeOperation = 'destination-out'
      ctx.globalAlpha = opacity * flow
      
      // Create temporary canvas for eraser stamp
      const stampCanvas = document.createElement('canvas')
      stampCanvas.width = this.currentEraserStamp!.width
      stampCanvas.height = this.currentEraserStamp!.height
      const stampCtx = stampCanvas.getContext('2d')!
      
      // Create white stamp with alpha from brush tip
      const stampData = stampCtx.createImageData(
        this.currentEraserStamp!.width,
        this.currentEraserStamp!.height
      )
      
      for (let i = 0; i < this.currentEraserStamp!.data.length; i += 4) {
        stampData.data[i] = 255
        stampData.data[i + 1] = 255
        stampData.data[i + 2] = 255
        stampData.data[i + 3] = this.currentEraserStamp!.data[i + 3]
      }
      
      stampCtx.putImageData(stampData, 0, 0)
      
      // Draw stamp
      ctx.drawImage(
        stampCanvas,
        localX - size / 2,
        localY - size / 2
      )
      
      // Restore composite operation
      ctx.globalCompositeOperation = prevOperation
    })
  }
  
  /**
   * Calculate dynamic eraser size based on pressure
   */
  private calculateEraserSize(pressure: number): number {
    const usePressure = this.getOption('pressureSensitivity.size') as boolean
    if (usePressure) {
      return Math.max(1, this.eraserSize * pressure)
    }
    return this.eraserSize
  }
  
  /**
   * Calculate dynamic opacity based on pressure
   */
  private calculateOpacity(pressure: number): number {
    const usePressure = this.getOption('pressureSensitivity.opacity') as boolean
    if (usePressure) {
      return this.eraserOpacity * pressure
    }
    return this.eraserOpacity
  }
  
  /**
   * Calculate dynamic flow based on pressure
   */
  private calculateFlow(pressure: number): number {
    const usePressure = this.getOption('pressureSensitivity.flow') as boolean
    if (usePressure) {
      return this.eraserFlow * pressure
    }
    return this.eraserFlow
  }
  
  /**
   * Update custom cursor
   */
  private updateCursor(): void {
    const cursorCanvas = this.brushEngine.createBrushCursor({
      size: this.eraserSize,
      hardness: this.eraserHardness,
      opacity: this.eraserOpacity * 100,
      flow: this.eraserFlow * 100,
      spacing: this.eraserSpacing * 100,
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
    switch (key) {
      case 'size':
        this.eraserSize = value as number
        this.currentEraserStamp = null
        this.updateCursor()
        break
      case 'hardness':
        this.eraserHardness = value as number
        this.currentEraserStamp = null
        this.updateCursor()
        break
      case 'opacity':
        this.eraserOpacity = (value as number) / 100
        break
      case 'flow':
        this.eraserFlow = (value as number) / 100
        break
      case 'spacing':
        this.eraserSpacing = (value as number) / 100
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
export const eraserTool = new EraserTool() 