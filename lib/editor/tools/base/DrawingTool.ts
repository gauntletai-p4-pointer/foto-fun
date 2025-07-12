import Konva from 'konva'
import { BaseTool } from './BaseTool'
import { Point } from '@/lib/editor/canvas/types'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { createToolState } from '../utils/toolState'
// Tool option type
export interface ToolOption {
  id: string
  value: unknown
}
import { nanoid } from 'nanoid'

export interface DrawingToolConfig {
  brushSize?: number
  opacity?: number
  blendMode?: string
  smoothing?: boolean
}

export interface DrawingToolDependencies {
  typedEventBus: TypedEventBus
  canvasManager: CanvasManager
}

/**
 * Base class for drawing tools with proper dependency injection
 */
export abstract class DrawingTool extends BaseTool {
  // Encapsulated state
  protected state = createToolState<{
    isDrawing: boolean
    lastPoint: Point | null
    currentPath: Point[]
    currentStroke: Konva.Path | null
    previewLayer: Konva.Layer | null
  }>({
    isDrawing: false,
    lastPoint: null,
    currentPath: [],
    currentStroke: null,
    previewLayer: null
  })
  
  protected typedEventBus: TypedEventBus
  protected canvasManager: CanvasManager
  protected config: DrawingToolConfig

  constructor(
    dependencies: DrawingToolDependencies,
    config: DrawingToolConfig = {}
  ) {
    super()
    this.typedEventBus = dependencies.typedEventBus
    this.canvasManager = dependencies.canvasManager
    this.config = {
      brushSize: 10,
      opacity: 1,
      blendMode: 'source-over',
      smoothing: true,
      ...config
    }
  }
  
  // Tool properties
  protected abstract strokeColor: string
  protected abstract strokeWidth: number
  protected abstract opacity: number
  
  /**
   * Tool-specific setup
   */
  protected setupTool(): void {
    if (!this.canvas) return
    
    // Create preview layer for drawing
    const previewLayer = new Konva.Layer()
    this.canvas.stage.add(previewLayer)
    this.state.set('previewLayer', previewLayer)
  }
  
  /**
   * Tool-specific cleanup
   */
  protected cleanupTool(): void {
    // Clean up preview layer
    const previewLayer = this.state.get('previewLayer')
    if (previewLayer) {
      previewLayer.destroy()
    }
    
    // Clean up any in-progress stroke
    const currentStroke = this.state.get('currentStroke')
    if (currentStroke) {
      currentStroke.destroy()
    }
    
    // Reset state
    this.state.reset()
  }
  
  /**
   * Handle mouse down - start drawing
   */
  onMouseDown(event: { point: Point }): void {
    if (!this.canvas) return
    
    const point = event.point
    
    // Update state
    this.state.setState({
      isDrawing: true,
      lastPoint: point,
      currentPath: [point],
      currentStroke: null
    })
    
    // Begin stroke
    this.beginStroke(point)
  }
  
  /**
   * Handle mouse move - continue drawing
   */
  onMouseMove(event: { point: Point }): void {
    if (!this.canvas || !this.state.get('isDrawing')) return
    
    const point = event.point
    const lastPoint = this.state.get('lastPoint')
    
    if (lastPoint && this.shouldDrawSegment(lastPoint, point)) {
      // Add to path
      const currentPath = [...this.state.get('currentPath'), point]
      this.state.set('currentPath', currentPath)
      this.state.set('lastPoint', point)
      
      // Update stroke
      this.updateStroke()
    }
  }
  
  /**
   * Handle mouse up - finish drawing
   */
  onMouseUp(_event: { point: Point }): void {
    if (!this.canvas || !this.state.get('isDrawing')) return
    
    const currentPath = this.state.get('currentPath')
    
    if (currentPath.length > 1) {
      // Finalize the stroke
      this.finalizeStroke()
    }
    
    // Reset drawing state
    this.state.setState({
      isDrawing: false,
      lastPoint: null,
      currentPath: [],
      currentStroke: null
    })
  }
  
  /**
   * Check if we should draw a segment (for performance)
   */
  protected shouldDrawSegment(lastPoint: Point, currentPoint: Point): boolean {
    // Minimum distance to avoid too many points
    const dx = currentPoint.x - lastPoint.x
    const dy = currentPoint.y - lastPoint.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance > 1 // Minimum 1 pixel distance
  }
  
  /**
   * Begin a new stroke
   */
  protected beginStroke(point: Point): void {
    const previewLayer = this.state.get('previewLayer')
    if (!previewLayer) return
    
    // Create initial path
    const path = new Konva.Path({
      data: `M ${point.x} ${point.y}`,
      stroke: this.strokeColor,
      strokeWidth: this.strokeWidth,
      opacity: this.opacity,
      lineCap: 'round',
      lineJoin: 'round',
      globalCompositeOperation: this.getBlendMode() as GlobalCompositeOperation
    })
    
    previewLayer.add(path)
    previewLayer.batchDraw()
    
    this.state.set('currentStroke', path)
  }
  
  /**
   * Update the current stroke
   */
  protected updateStroke(): void {
    const currentStroke = this.state.get('currentStroke')
    const previewLayer = this.state.get('previewLayer')
    if (!currentStroke || !previewLayer) return
    
    // Update path data
    const currentPath = this.state.get('currentPath')
    const pathData = this.createSmoothPath(currentPath)
    currentStroke.data(pathData)
    
    previewLayer.batchDraw()
  }
  
  /**
   * Finalize the stroke and create a command
   */
  protected async finalizeStroke(): Promise<void> {
    const currentStroke = this.state.get('currentStroke')
    const previewLayer = this.state.get('previewLayer')
    if (!currentStroke || !previewLayer || !this.canvas) return
    
    // Get path data
    const pathData = currentStroke.data()
    
    // Remove from preview layer
    currentStroke.remove()
    previewLayer.batchDraw()
    
    // Calculate bounds from path data
    const bounds = this.calculatePathBounds(pathData)
    
    // Create canvas object with proper CanvasObject interface
    const pathObject = {
      id: nanoid(),
      type: 'shape' as const,
      name: 'Drawing',
      visible: true,
      locked: false,
      opacity: this.opacity,
      blendMode: 'normal' as const,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 0,
      filters: [],
      adjustments: [],
      data: {
        type: 'path' as const,
        path: pathData,
        fill: 'none',
        stroke: this.strokeColor,
        strokeWidth: this.strokeWidth
      },
      layerId: 'main' // Objects are managed directly now
    }
    
    // Add to canvas
    await this.canvas.addObject(pathObject)
    
    // Emit event
    this.typedEventBus.emit('canvas.object.added', {
      canvasId: this.canvas.stage.id() || 'main',
      object: pathObject,
      layerId: pathObject.layerId
    })
  }
  
  /**
   * Get blend mode for the tool
   */
  protected abstract getBlendMode(): GlobalCompositeOperation
  
  /**
   * Update tool properties from options
   */
  protected abstract updateToolProperties(options: ToolOption[]): void
  
  /**
   * Helper to create a smooth path from points
   */
  protected createSmoothPath(points: Point[]): string {
    if (points.length < 2) return ''
    
    let pathData = `M ${points[0].x} ${points[0].y}`
    
    if (points.length === 2) {
      pathData += ` L ${points[1].x} ${points[1].y}`
    } else {
      // Use quadratic bezier curves for smoothing
      for (let i = 1; i < points.length - 1; i++) {
        const cp = points[i]
        const next = points[i + 1]
        pathData += ` Q ${cp.x} ${cp.y} ${(cp.x + next.x) / 2} ${(cp.y + next.y) / 2}`
      }
      // Add the last point
      const last = points[points.length - 1]
      pathData += ` L ${last.x} ${last.y}`
    }
    
    return pathData
  }
  
  /**
   * Calculate bounds from SVG path data
   */
  protected calculatePathBounds(pathData: string): { x: number; y: number; width: number; height: number } {
    if (!pathData || pathData.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    
    // Extract numbers from path data (simplified approach)
    const numbers = pathData.match(/-?\d*\.?\d+/g)?.map(Number) || []
    
    if (numbers.length < 2) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    
    // Get x and y coordinates (every even index is x, odd is y)
    const xCoords = []
    const yCoords = []
    
    for (let i = 0; i < numbers.length; i += 2) {
      if (i + 1 < numbers.length) {
        xCoords.push(numbers[i])
        yCoords.push(numbers[i + 1])
      }
    }
    
    const minX = Math.min(...xCoords)
    const maxX = Math.max(...xCoords)
    const minY = Math.min(...yCoords)
    const maxY = Math.max(...yCoords)
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }
} 