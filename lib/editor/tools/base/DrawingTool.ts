import { BaseTool } from './BaseTool'
import type { Canvas } from 'fabric'
import { Path } from 'fabric'
import { createToolState } from '../utils/toolState'
import type { Point } from '../utils/constraints'
import type { ToolOption } from '@/store/toolOptionsStore'

// Drawing tool state
type DrawingToolState = {
  isDrawing: boolean
  lastPoint: Point | null
  currentPath: Point[]
  currentStroke: Path | null
}

/**
 * Base class for drawing tools (brush, pencil, eraser, etc.)
 * Demonstrates proper state management and command patterns for drawing
 */
export abstract class DrawingTool extends BaseTool {
  // Encapsulated state
  protected state = createToolState<DrawingToolState>({
    isDrawing: false,
    lastPoint: null,
    currentPath: [],
    currentStroke: null
  })
  
  // Tool properties
  protected abstract strokeColor: string
  protected abstract strokeWidth: number
  protected abstract opacity: number
  
  /**
   * Tool-specific setup
   */
  protected setupTool(canvas: Canvas): void {
    // Disable object selection while drawing
    canvas.selection = false
    canvas.isDrawingMode = false // We handle drawing manually
    
    // Set up event handlers
    this.addCanvasEvent('mouse:down', (e: unknown) => this.handleMouseDown(e as { scenePoint: Point; e: MouseEvent }))
    this.addCanvasEvent('mouse:move', (e: unknown) => this.handleMouseMove(e as { scenePoint: Point; e: MouseEvent }))
    this.addCanvasEvent('mouse:up', () => this.handleMouseUp())
    
    // Subscribe to tool options for real-time updates
    this.subscribeToToolOptions((options) => {
      // Update tool properties based on options
      this.updateToolProperties(options)
    })
  }
  
  /**
   * Tool-specific cleanup
   */
  protected cleanup(canvas: Canvas): void {
    // Clean up any in-progress stroke
    const currentStroke = this.state.get('currentStroke')
    if (currentStroke && canvas.contains(currentStroke)) {
      canvas.remove(currentStroke)
    }
    
    // Reset state
    this.state.reset()
    
    // Re-enable object selection
    canvas.selection = true
  }
  
  /**
   * Handle mouse down - start drawing
   */
  protected handleMouseDown(e: { scenePoint: Point; e: MouseEvent }): void {
    if (!this.canvas) return
    
    this.track('startStroke', () => {
      const point = { x: e.scenePoint.x, y: e.scenePoint.y }
      
      // Update state
      this.state.setState({
        isDrawing: true,
        lastPoint: point,
        currentPath: [point],
        currentStroke: null
      })
      
      // Begin stroke
      this.beginStroke(point, e.e)
    })
  }
  
  /**
   * Handle mouse move - continue drawing
   */
  protected handleMouseMove(e: { scenePoint: Point; e: MouseEvent }): void {
    if (!this.canvas || !this.state.get('isDrawing')) return
    
    this.track('continueStroke', () => {
      const point = { x: e.scenePoint.x, y: e.scenePoint.y }
      const lastPoint = this.state.get('lastPoint')
      
      if (lastPoint && this.shouldDrawSegment(lastPoint, point)) {
        // Add to path
        const currentPath = [...this.state.get('currentPath'), point]
        this.state.set('currentPath', currentPath)
        this.state.set('lastPoint', point)
        
        // Update stroke
        this.updateStroke(point, e.e)
      }
    })
  }
  
  /**
   * Handle mouse up - finish drawing
   */
  protected handleMouseUp(): void {
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
  protected abstract beginStroke(point: Point, event: MouseEvent): void
  
  /**
   * Update the current stroke
   */
  protected abstract updateStroke(point: Point, event: MouseEvent): void
  
  /**
   * Finalize the stroke and create a command
   */
  protected abstract finalizeStroke(): void
  
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