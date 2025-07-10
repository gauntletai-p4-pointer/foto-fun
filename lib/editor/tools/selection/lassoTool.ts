import { Lasso } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'

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
  
  async onMouseUp(_event: ToolEvent): Promise<void> {
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
    const selectionManager = canvas.getSelectionManager()
    
    // Get the current selection mode
    const mode = this.getOption('mode') as 'new' | 'add' | 'subtract' | 'intersect' || 'new'
    const selectionMode = mode === 'new' ? 'replace' : mode
    
    // Convert points to SVG path data
    let pathData = `M ${this.points[0].x} ${this.points[0].y}`
    
    // Use quadratic curves for smooth path
    for (let i = 1; i < this.points.length - 1; i++) {
      const xc = (this.points[i].x + this.points[i + 1].x) / 2
      const yc = (this.points[i].y + this.points[i + 1].y) / 2
      pathData += ` Q ${this.points[i].x} ${this.points[i].y} ${xc} ${yc}`
    }
    
    // Last point
    const lastPoint = this.points[this.points.length - 1]
    pathData += ` Q ${lastPoint.x} ${lastPoint.y} ${this.points[0].x} ${this.points[0].y}`
    pathData += ' Z' // Close path
    
    // Create selection from path
    selectionManager.createFromPath(pathData, selectionMode)
    
    // The selection events will be emitted by the SelectionManager
    
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
    const selectionManager = canvas.getSelectionManager()
    
    // Get the current selection mode
    const mode = this.getOption('mode') as 'new' | 'add' | 'subtract' | 'intersect' || 'new'
    const selectionMode = mode === 'new' ? 'replace' : mode
    
    // Convert points to SVG path data
    let pathData = `M ${points[0].x} ${points[0].y}`
    
    for (let i = 1; i < points.length; i++) {
      pathData += ` L ${points[i].x} ${points[i].y}`
    }
    pathData += ' Z' // Close path
    
    // Create selection from path
    selectionManager.createFromPath(pathData, selectionMode)
    
    // The selection events will be emitted by the SelectionManager
  }
}

// Export singleton instance
export const lassoTool = new LassoTool() 