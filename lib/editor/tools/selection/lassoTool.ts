import { Lasso } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point, Selection } from '@/lib/editor/canvas/types'
import { SelectionCreatedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Lasso Tool - Creates freehand selections
 * Konva implementation with pixel-aware selection and path smoothing
 */
export class LassoTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.LASSO
  name = 'Lasso Tool'
  icon = Lasso
  cursor = 'crosshair'
  shortcut = 'L'
  
  // Selection state
  private isSelecting = false
  private points: Point[] = []
  private selectionPath: Konva.Line | null = null
  private selectionLayer: Konva.Layer | null = null
  private minDistance = 3 // Minimum distance between points for smoothing
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Create a dedicated layer for selection visualization
    this.selectionLayer = new Konva.Layer()
    canvas.konvaStage.add(this.selectionLayer)
    
    // Move selection layer to top
    this.selectionLayer.moveToTop()
  }
  
  protected cleanupTool(): void {
    // Clean up selection layer
    if (this.selectionLayer) {
      this.selectionLayer.destroy()
      this.selectionLayer = null
    }
    
    // Reset state
    this.isSelecting = false
    this.points = []
    this.selectionPath = null
  }
  
  onMouseDown(event: ToolEvent): void {
    if (!this.selectionLayer) return
    
    this.isSelecting = true
    this.points = [{ x: event.point.x, y: event.point.y }]
    
    // Create initial path
    this.selectionPath = new Konva.Line({
      points: [event.point.x, event.point.y],
      stroke: '#000000',
      strokeWidth: 1,
      dash: [4, 4],
      closed: false,
      tension: 0.3, // Add smoothing
      lineCap: 'round',
      lineJoin: 'round'
    })
    
    // Add white background stroke for visibility
    const bgPath = new Konva.Line({
      points: [event.point.x, event.point.y],
      stroke: '#ffffff',
      strokeWidth: 3,
      closed: false,
      tension: 0.3,
      lineCap: 'round',
      lineJoin: 'round'
    })
    
    this.selectionLayer.add(bgPath)
    this.selectionLayer.add(this.selectionPath)
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isSelecting || !this.selectionPath || !this.selectionLayer) return
    
    const lastPoint = this.points[this.points.length - 1]
    const currentPoint = { x: event.point.x, y: event.point.y }
    
    // Only add point if it's far enough from the last one (smoothing)
    const distance = Math.sqrt(
      Math.pow(currentPoint.x - lastPoint.x, 2) + 
      Math.pow(currentPoint.y - lastPoint.y, 2)
    )
    
    if (distance >= this.minDistance) {
      this.points.push(currentPoint)
      
      // Update path points
      const flatPoints = this.points.flatMap(p => [p.x, p.y])
      this.selectionPath.points(flatPoints)
      
      // Update background path
      const bgPath = this.selectionLayer.children[0] as Konva.Line
      if (bgPath) {
        bgPath.points(flatPoints)
      }
      
      this.selectionLayer.batchDraw()
    }
  }
  
  async onMouseUp(event: ToolEvent): Promise<void> {
    if (!this.isSelecting || !this.selectionPath || !this.selectionLayer || this.points.length < 3) {
      // Need at least 3 points for a valid selection
      this.cleanupSelection()
      return
    }
    
    this.isSelecting = false
    
    // Close the path
    this.selectionPath.closed(true)
    const bgPath = this.selectionLayer.children[0] as Konva.Line
    if (bgPath) {
      bgPath.closed(true)
    }
    this.selectionLayer.batchDraw()
    
    // Create selection from path
    const canvas = this.getCanvas()
    
    // Get bounding box of the path
    const bounds = this.selectionPath.getClientRect()
    
    // Create a temporary canvas to render the path as a mask
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.state.width
    tempCanvas.height = canvas.state.height
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!
    
    // Create path2D from points
    const path2D = new Path2D()
    path2D.moveTo(this.points[0].x, this.points[0].y)
    
    // Use quadratic curves for smooth path
    for (let i = 1; i < this.points.length - 1; i++) {
      const xc = (this.points[i].x + this.points[i + 1].x) / 2
      const yc = (this.points[i].y + this.points[i + 1].y) / 2
      path2D.quadraticCurveTo(this.points[i].x, this.points[i].y, xc, yc)
    }
    
    // Last point
    const lastPoint = this.points[this.points.length - 1]
    path2D.quadraticCurveTo(lastPoint.x, lastPoint.y, this.points[0].x, this.points[0].y)
    path2D.closePath()
    
    // Fill the path to create mask
    tempCtx.fillStyle = 'white'
    tempCtx.fill(path2D)
    
    // Get the image data for the mask
    const imageData = tempCtx.getImageData(
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    )
    
    // Create pixel-aware selection
    const selection: Selection = {
      type: 'pixel',
      bounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      },
      mask: imageData
    }
    
    // Set selection on canvas
    canvas.setSelection(selection)
    
    // Emit event if in ExecutionContext
    if (this.executionContext) {
      await this.executionContext.emit(new SelectionCreatedEvent(
        'canvas',
        selection,
        this.executionContext.getMetadata()
      ))
    }
    
    // Clean up visual feedback
    this.cleanupSelection()
  }
  
  onKeyDown(event: KeyboardEvent): void {
    // Cancel selection on Escape
    if (event.key === 'Escape' && this.isSelecting) {
      this.cleanupSelection()
      this.isSelecting = false
    }
  }
  
  /**
   * Clean up selection visualization
   */
  private cleanupSelection(): void {
    if (this.selectionLayer) {
      this.selectionLayer.destroyChildren()
      this.selectionLayer.batchDraw()
    }
    
    this.points = []
    this.selectionPath = null
  }
  
  /**
   * Apply selection with magnetic lasso option
   */
  async applyWithContext(
    points: Point[],
    options?: { magnetic?: boolean; tolerance?: number }
  ): Promise<void> {
    if (points.length < 3) {
      console.warn('[LassoTool] Need at least 3 points for selection')
      return
    }
    
    this.points = points
    
    if (options?.magnetic) {
      // TODO: Implement magnetic lasso edge detection
      console.log('[LassoTool] Magnetic lasso not yet implemented')
    }
    
    // Create selection from provided points
    const canvas = this.getCanvas()
    
    // Calculate bounds
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity
    
    for (const point of points) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
    
    const bounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
    
    // Create mask from points
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = bounds.width
    tempCanvas.height = bounds.height
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!
    
    // Translate to local coordinates
    tempCtx.translate(-bounds.x, -bounds.y)
    
    // Create path
    const path2D = new Path2D()
    path2D.moveTo(points[0].x, points[0].y)
    
    for (let i = 1; i < points.length; i++) {
      path2D.lineTo(points[i].x, points[i].y)
    }
    path2D.closePath()
    
    // Fill to create mask
    tempCtx.fillStyle = 'white'
    tempCtx.fill(path2D)
    
    const imageData = tempCtx.getImageData(0, 0, bounds.width, bounds.height)
    
    // Create selection
    const selection: Selection = {
      type: 'pixel',
      bounds,
      mask: imageData
    }
    
    canvas.setSelection(selection)
    
    // Emit event if in ExecutionContext
    if (this.executionContext) {
      await this.executionContext.emit(new SelectionCreatedEvent(
        'canvas',
        selection,
        this.executionContext.getMetadata()
      ))
    }
  }
}

// Export singleton instance
export const lassoTool = new LassoTool() 