import { BaseTool } from './BaseTool'
import type { CanvasManager, ToolEvent, Point } from '@/lib/editor/canvas/types'
import Konva from 'konva'
import { createToolState } from '../utils/toolState'
// Tool option type
export interface ToolOption {
  id: string
  value: any
}
import { nanoid } from 'nanoid'
import { getTypedEventBus } from '@/lib/events/core/TypedEventBus'

// Drawing tool state
type DrawingToolState = {
  isDrawing: boolean
  lastPoint: Point | null
  currentPath: Point[]
  currentStroke: Konva.Path | null
  previewLayer: Konva.Layer | null
}

/**
 * Base class for drawing tools (brush, pencil, eraser, etc.)
 * Uses Konva for rendering and follows event-driven architecture
 */
export abstract class DrawingTool extends BaseTool {
  // Encapsulated state
  protected state = createToolState<DrawingToolState>({
    isDrawing: false,
    lastPoint: null,
    currentPath: [],
    currentStroke: null,
    previewLayer: null
  })
  
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
    this.canvas.konvaStage.add(previewLayer)
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
  onMouseDown(event: ToolEvent): void {
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
    this.beginStroke(point, event)
  }
  
  /**
   * Handle mouse move - continue drawing
   */
  onMouseMove(event: ToolEvent): void {
    if (!this.canvas || !this.state.get('isDrawing')) return
    
    this.track('continueStroke', () => {
      const point = event.point
      const lastPoint = this.state.get('lastPoint')
      
      if (lastPoint && this.shouldDrawSegment(lastPoint, point)) {
        // Add to path
        const currentPath = [...this.state.get('currentPath'), point]
        this.state.set('currentPath', currentPath)
        this.state.set('lastPoint', point)
        
        // Update stroke
        this.updateStroke(point, event)
      }
    })
  }
  
  /**
   * Handle mouse up - finish drawing
   */
  onMouseUp(event: ToolEvent): void {
    if (!this.canvas || !this.state.get('isDrawing')) return
    
    this.track('endStroke', () => {
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
  protected beginStroke(point: Point, event: ToolEvent): void {
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
      globalCompositeOperation: this.getBlendMode()
    })
    
    previewLayer.add(path)
    previewLayer.batchDraw()
    
    this.state.set('currentStroke', path)
  }
  
  /**
   * Update the current stroke
   */
  protected updateStroke(point: Point, event: ToolEvent): void {
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
    
    // Create canvas object
    const pathObject = {
      id: nanoid(),
      type: 'path' as const,
      name: 'Drawing',
      visible: true,
      locked: false,
      opacity: this.opacity,
      blendMode: 'normal' as const,
      transform: {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        skewX: 0,
        skewY: 0
      },
      node: null as any,
      layerId: this.canvas.state.activeLayerId || this.canvas.state.layers[0].id,
      data: pathData,
      style: {
        stroke: this.strokeColor,
        strokeWidth: this.strokeWidth,
        lineCap: 'round',
        lineJoin: 'round'
      }
    }
    
    // Add to canvas
    await this.canvas.addObject(pathObject)
    
    // Emit event
    const eventBus = getTypedEventBus()
    eventBus.emit('canvas.object.added', {
      canvasId: (this.canvas as any).id || 'main',
      object: pathObject,
      layerId: pathObject.layerId
    })
  }
  
  /**
   * Get blend mode for the tool
   */
  protected abstract getBlendMode(): string
  
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
} 