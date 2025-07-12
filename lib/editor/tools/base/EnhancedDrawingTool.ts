import Konva from 'konva'
import { DrawingTool, DrawingToolDependencies, DrawingToolConfig } from './DrawingTool'
import type { Point } from '@/lib/editor/canvas/types'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { nanoid } from 'nanoid'

export interface DrawingPoint {
  x: number
  y: number
  pressure?: number
  timestamp: number
}

export interface DrawingOptions {
  color: string
  size: number
  opacity: number
  smoothing: number
  pressureSensitivity: boolean
  hardness: number // 0-100, brush edge hardness
  spacing: number // Distance between brush stamps as percentage of size
  blendMode?: GlobalCompositeOperation
}

export interface DrawingContext {
  points: DrawingPoint[]
  path: Konva.Path | null
  tempPath: Konva.Path | null
  lastPoint: DrawingPoint | null
  distance: number // Total distance drawn
  isDrawing: boolean
}

/**
 * Enhanced Drawing Tool with advanced features
 * Now uses dependency injection instead of singleton pattern
 */
export class EnhancedDrawingTool extends DrawingTool {
  protected typedEventBus: TypedEventBus
  private enhancedConfig: EnhancedDrawingToolConfig

  constructor(
    dependencies: DrawingToolDependencies,
    config: EnhancedDrawingToolConfig = {}
  ) {
    super(dependencies, config)
    this.typedEventBus = dependencies.typedEventBus
    this.enhancedConfig = {
      pressureSensitive: false,
      tiltSensitive: false,
      textureEnabled: false,
      antiAliasing: true,
      ...config
    }
  }

  /**
   * Initialize drawing layers
   */
  protected initializeDrawingLayers(canvas: any): void {
    const stage = canvas.stage
    if (!stage) return
    
    // Create temporary drawing layer for live preview
    this.tempLayer = new Konva.Layer({
      name: 'temp-drawing-layer'
    })
    stage.add(this.tempLayer)
    
    // Use the content layer for drawing in object-based architecture
    this.drawingLayer = canvas.contentLayer || null
  }
  
  /**
   * Start drawing
   */
  protected startDrawing(event: any, _context: any): void {
    const point = this.getEventPoint(event)
    if (!point) return
    
    // Initialize drawing context
    this.drawingContext = {
      points: [point],
      path: null,
      tempPath: null,
      lastPoint: point,
      distance: 0,
      isDrawing: true
    }
    
    // Create temporary path for live preview
    this.drawingContext.tempPath = new Konva.Path({
      data: '',
      stroke: this.drawingOptions.color,
      strokeWidth: this.drawingOptions.size,
      opacity: this.drawingOptions.opacity,
      lineJoin: 'round',
      lineCap: 'round',
      globalCompositeOperation: this.drawingOptions.blendMode
    })
    
    if (this.tempLayer) {
      this.tempLayer.add(this.drawingContext.tempPath)
      this.tempLayer.batchDraw()
    }
    
    // Emit drawing started event
    this.typedEventBus.emit('drawing.started', {
      toolId: this.id,
      point: point,
      options: this.drawingOptions as unknown as Record<string, unknown>
    })
  }
  
  /**
   * Continue drawing
   */
  protected continueDrawing(event: any, _context: any): void {
    if (!this.drawingContext.isDrawing) return
    
    const point = this.getEventPoint(event)
    if (!point) return
    
    // Add point with smoothing
    const smoothedPoint = this.smoothPoint(point, this.drawingContext.lastPoint!)
    this.drawingContext.points.push(smoothedPoint)
    
    // Update distance
    if (this.drawingContext.lastPoint) {
      const dx = smoothedPoint.x - this.drawingContext.lastPoint.x
      const dy = smoothedPoint.y - this.drawingContext.lastPoint.y
      this.drawingContext.distance += Math.sqrt(dx * dx + dy * dy)
    }
    
    // Update path
    this.updatePath()
    
    this.drawingContext.lastPoint = smoothedPoint
  }
  
  /**
   * End drawing
   */
  protected endDrawing(_event: any, _context: any): void {
    if (!this.drawingContext.isDrawing) return
    
    this.drawingContext.isDrawing = false
    
    // Finalize the path
    const finalPath = this.finalizePath()
    
    if (finalPath && this.drawingLayer) {
      // Remove temporary path
      if (this.drawingContext.tempPath) {
        this.drawingContext.tempPath.destroy()
      }
      
      // Add final path to main layer
      this.drawingLayer.add(finalPath)
      this.drawingLayer.batchDraw()
      
      // Clear temp layer
      if (this.tempLayer) {
        this.tempLayer.destroyChildren()
        this.tempLayer.batchDraw()
      }
      
      // Emit drawing completed event
      this.typedEventBus.emit('drawing.completed', {
        toolId: this.id,
        pathId: finalPath.id(),
        bounds: finalPath.getClientRect()
      })
    }
    
    // Reset context
    this.resetDrawingContext()
  }
  
  /**
   * Update the drawing path
   */
  protected updatePath(): void {
    if (!this.drawingContext.tempPath || this.drawingContext.points.length < 2) {
      return
    }
    
    // Generate smooth path data
    const pathData = this.generatePathData(this.drawingContext.points)
    this.drawingContext.tempPath.data(pathData)
    
    // Apply pressure-based stroke width if enabled
    if (this.drawingOptions.pressureSensitivity && this.drawingContext.lastPoint?.pressure) {
      const size = this.drawingOptions.size * this.drawingContext.lastPoint.pressure
      this.drawingContext.tempPath.strokeWidth(size)
    }
    
    // Redraw
    if (this.tempLayer) {
      this.tempLayer.batchDraw()
    }
  }
  
  /**
   * Generate smooth SVG path data from points
   */
  protected generatePathData(points: DrawingPoint[]): string {
    if (points.length < 2) return ''
    
    // Start with move command
    let pathData = `M ${points[0].x} ${points[0].y}`
    
    if (points.length === 2) {
      // Simple line for 2 points
      pathData += ` L ${points[1].x} ${points[1].y}`
    } else {
      // Use quadratic bezier curves for smooth drawing
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2
        const yc = (points[i].y + points[i + 1].y) / 2
        pathData += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`
      }
      
      // Add last point
      const lastPoint = points[points.length - 1]
      pathData += ` L ${lastPoint.x} ${lastPoint.y}`
    }
    
    return pathData
  }
  
  /**
   * Smooth a point based on previous point
   */
  protected smoothPoint(current: DrawingPoint, previous: DrawingPoint): DrawingPoint {
    const smoothing = this.drawingOptions.smoothing
    
    return {
      x: previous.x + (current.x - previous.x) * (1 - smoothing),
      y: previous.y + (current.y - previous.y) * (1 - smoothing),
      pressure: current.pressure,
      timestamp: current.timestamp
    }
  }
  
  /**
   * Finalize the drawing path
   */
  protected finalizePath(): Konva.Path | null {
    if (!this.drawingContext.tempPath || this.drawingContext.points.length < 2) {
      return null
    }
    
    // Optimize path data
    const optimizedPoints = this.optimizePoints(this.drawingContext.points)
    const pathData = this.generatePathData(optimizedPoints)
    
    // Create final path
    const finalPath = new Konva.Path({
      id: nanoid(),
      name: `${this.id}-path`,
      data: pathData,
      stroke: this.drawingOptions.color,
      strokeWidth: this.drawingOptions.size,
      opacity: this.drawingOptions.opacity,
      lineJoin: 'round',
      lineCap: 'round',
      globalCompositeOperation: this.drawingOptions.blendMode,
      draggable: false
    })
    
    return finalPath
  }
  
  /**
   * Optimize points by reducing redundant ones
   */
  protected optimizePoints(points: DrawingPoint[]): DrawingPoint[] {
    if (points.length <= 2) return points
    
    const optimized: DrawingPoint[] = [points[0]]
    const tolerance = 1.5 // Pixels
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = optimized[optimized.length - 1]
      const curr = points[i]
      const next = points[i + 1]
      
      // Check if current point is necessary
      const distance = this.pointToLineDistance(curr, prev, next)
      
      if (distance > tolerance) {
        optimized.push(curr)
      }
    }
    
    // Always include last point
    optimized.push(points[points.length - 1])
    
    return optimized
  }
  
  /**
   * Calculate distance from point to line
   */
  protected pointToLineDistance(
    point: DrawingPoint,
    lineStart: DrawingPoint,
    lineEnd: DrawingPoint
  ): number {
    const A = point.x - lineStart.x
    const B = point.y - lineStart.y
    const C = lineEnd.x - lineStart.x
    const D = lineEnd.y - lineStart.y
    
    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1
    
    if (lenSq !== 0) {
      param = dot / lenSq
    }
    
    let xx, yy
    
    if (param < 0) {
      xx = lineStart.x
      yy = lineStart.y
    } else if (param > 1) {
      xx = lineEnd.x
      yy = lineEnd.y
    } else {
      xx = lineStart.x + param * C
      yy = lineStart.y + param * D
    }
    
    const dx = point.x - xx
    const dy = point.y - yy
    
    return Math.sqrt(dx * dx + dy * dy)
  }
  
  /**
   * Get point from tool event
   */
  protected getEventPoint(event: any): DrawingPoint {
    const pressure = 0.5 // Default pressure since ToolEvent doesn't have pressure info
    
    return {
      x: event.point.x,
      y: event.point.y,
      pressure,
      timestamp: Date.now()
    }
  }
  
  /**
   * Reset drawing context
   */
  protected resetDrawingContext(): void {
    this.drawingContext = {
      points: [],
      path: null,
      tempPath: null,
      lastPoint: null,
      distance: 0,
      isDrawing: false
    }
  }
  
  /**
   * Update drawing options
   */
  updateOptions(options: Partial<DrawingOptions>): void {
    this.drawingOptions = {
      ...this.drawingOptions,
      ...options
    }
    
    // Emit options changed event
    this.typedEventBus.emit('drawing.options.changed', {
      toolId: this.id,
      options: this.drawingOptions as unknown as Record<string, unknown>
    })
  }
  
  /**
   * Handle tool events
   */
  handleEvent(event: any, context: any): void {
    switch (event.type) {
      case 'mousedown':
        this.startDrawing(event, context)
        break
        
      case 'mousemove':
        if (this.drawingContext.isDrawing) {
          this.continueDrawing(event, context)
        }
        break
        
      case 'mouseup':
        if (this.drawingContext.isDrawing) {
          this.endDrawing(event, context)
        }
        break
    }
  }
  
  /**
   * Activate tool
   */
  onActivate(canvas: any): void {
    super.onActivate(canvas)
    this.initializeDrawingLayers(canvas)
  }
  
  /**
   * Deactivate tool
   */
  onDeactivate(canvas: any): void {
    super.onDeactivate(canvas)
    
    // Clean up temporary layer
    if (this.tempLayer) {
      this.tempLayer.destroy()
      this.tempLayer = null
    }
    
    // Reset drawing context
    this.resetDrawingContext()
  }
} 