import { BaseTool } from './BaseTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'
import { BrushEngine } from '../engines/BrushEngine'
import { BlendingEngine } from '../engines/BlendingEngine'
import { PixelBuffer } from '../engines/PixelBuffer'
import type { BrushDynamics, BrushSettings } from '../types/brush-types'

/**
 * Base class for pixel-based painting tools
 * Provides common functionality for brush, eraser, clone stamp, healing brush, etc.
 */
export abstract class BasePixelTool extends BaseTool {
  protected brushEngine: BrushEngine
  protected blendingEngine: BlendingEngine
  protected pixelBuffer: PixelBuffer | null = null
  
  // Painting state
  protected isPainting = false
  protected lastPoint: Point | null = null
  protected paintPath: Point[] = []
  protected currentStroke: ImageData | null = null
  
  // Brush settings
  protected brushSettings: BrushSettings = {
    size: 10,
    hardness: 100,
    opacity: 100,
    flow: 100,
    spacing: 25,
    smoothing: 0,
    pressureSensitivity: {
      size: true,
      opacity: false,
      flow: false
    }
  }
  
  constructor() {
    super()
    this.brushEngine = new BrushEngine()
    this.blendingEngine = new BlendingEngine()
  }
  
  protected setupTool(): void {
    // Initialize pixel buffer for the active layer
    const canvas = this.getCanvas()
    const activeLayer = canvas.getActiveLayer()
    if (activeLayer) {
      this.pixelBuffer = new PixelBuffer(canvas, activeLayer)
    }
    
    // Load brush settings from options
    this.loadBrushSettings()
  }
  
  protected cleanupTool(): void {
    // Commit any pending changes
    if (this.isPainting && this.pixelBuffer) {
      this.finishStroke()
    }
    
    // Clean up pixel buffer
    if (this.pixelBuffer) {
      this.pixelBuffer.dispose()
      this.pixelBuffer = null
    }
  }
  
  onMouseDown(event: ToolEvent): void {
    if (!this.pixelBuffer) return
    
    this.isPainting = true
    this.lastPoint = event.point
    this.paintPath = [event.point]
    
    // Start a new stroke
    this.beginStroke(event)
    
    // Apply initial paint
    this.applyPaint(event.point, event.pressure || 1.0)
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isPainting || !this.pixelBuffer || !this.lastPoint) return
    
    const currentPoint = event.point
    const pressure = event.pressure || 1.0
    
    // Add smoothing if enabled
    const smoothedPoint = this.brushSettings.smoothing > 0
      ? this.brushEngine.smoothPoint(currentPoint, this.lastPoint, this.brushSettings.smoothing / 100)
      : currentPoint
    
    // Calculate distance for spacing
    const distance = this.calculateDistance(this.lastPoint, smoothedPoint)
    const spacing = (this.brushSettings.size * this.brushSettings.spacing) / 100
    
    if (distance >= spacing) {
      // Interpolate points based on spacing
      const steps = Math.floor(distance / spacing)
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const interpPoint = {
          x: this.lastPoint.x + (smoothedPoint.x - this.lastPoint.x) * t,
          y: this.lastPoint.y + (smoothedPoint.y - this.lastPoint.y) * t
        }
        
        this.applyPaint(interpPoint, pressure)
      }
      
      this.lastPoint = smoothedPoint
      this.paintPath.push(smoothedPoint)
    }
  }
  
  onMouseUp(_event: ToolEvent): void {
    if (!this.isPainting || !this.pixelBuffer) return
    
    this.isPainting = false
    this.finishStroke()
  }
  
  /**
   * Begin a new paint stroke
   */
  protected abstract beginStroke(event: ToolEvent): void
  
  /**
   * Apply paint at a specific point
   */
  protected abstract applyPaint(point: Point, pressure: number): void
  
  /**
   * Finish the current stroke and commit changes
   */
  protected async finishStroke(): Promise<void> {
    if (!this.pixelBuffer || !this.currentStroke) return
    
    // Commit the stroke to the layer
    await this.pixelBuffer.commitStroke()
    
    // Emit paint event
    if (this.executionContext) {
      // Event emission will be handled by pixel buffer
    }
    
    // Reset stroke data
    this.currentStroke = null
    this.paintPath = []
    this.lastPoint = null
  }
  
  /**
   * Load brush settings from tool options
   */
  protected loadBrushSettings(): void {
    this.brushSettings.size = (this.getOption('size') as number) || 10
    this.brushSettings.hardness = (this.getOption('hardness') as number) || 100
    this.brushSettings.opacity = (this.getOption('opacity') as number) || 100
    this.brushSettings.flow = (this.getOption('flow') as number) || 100
    this.brushSettings.spacing = (this.getOption('spacing') as number) || 25
    this.brushSettings.smoothing = (this.getOption('smoothing') as number) || 0
    
    const pressureSensitivity = this.getOption('pressureSensitivity') as Partial<BrushDynamics['pressureSensitivity']>
    if (pressureSensitivity) {
      this.brushSettings.pressureSensitivity = {
        ...this.brushSettings.pressureSensitivity,
        ...pressureSensitivity
      }
    }
  }
  
  /**
   * Calculate brush size with pressure dynamics
   */
  protected calculateBrushSize(pressure: number): number {
    const baseSize = this.brushSettings.size
    
    if (this.brushSettings.pressureSensitivity.size) {
      return baseSize * pressure
    }
    
    return baseSize
  }
  
  /**
   * Calculate opacity with pressure dynamics
   */
  protected calculateOpacity(pressure: number): number {
    const baseOpacity = this.brushSettings.opacity / 100
    
    if (this.brushSettings.pressureSensitivity.opacity) {
      return baseOpacity * pressure
    }
    
    return baseOpacity
  }
  
  /**
   * Calculate flow with pressure dynamics
   */
  protected calculateFlow(pressure: number): number {
    const baseFlow = this.brushSettings.flow / 100
    
    if (this.brushSettings.pressureSensitivity.flow) {
      return baseFlow * pressure
    }
    
    return baseFlow
  }
  
  /**
   * Calculate distance between two points
   */
  protected calculateDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.sqrt(dx * dx + dy * dy)
  }
  
  /**
   * Handle option changes
   */
  protected onOptionChange(key: string, value: unknown): void {
    // Update brush settings
    switch (key) {
      case 'size':
      case 'hardness':
      case 'opacity':
      case 'flow':
      case 'spacing':
      case 'smoothing':
        this.brushSettings[key] = value as number
        break
      case 'pressureSensitivity':
        this.brushSettings.pressureSensitivity = {
          ...this.brushSettings.pressureSensitivity,
          ...(value as Partial<BrushDynamics['pressureSensitivity']>)
        }
        break
    }
  }
} 