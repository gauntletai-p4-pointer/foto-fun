import { Lasso } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { Path } from 'fabric'
import { SelectionTool } from '../base/SelectionTool'
import { selectionStyle } from '../utils/selectionRenderer'
import { useCanvasStore } from '@/store/canvasStore'
import { useSelectionStore } from '@/store/selectionStore'
import type { Point } from '../utils/constraints'

/**
 * Lasso Tool - Creates freehand selections
 * Extends SelectionTool for consistent selection behavior
 */
class LassoTool extends SelectionTool {
  // Tool identification
  id = TOOL_IDS.LASSO
  name = 'Lasso Tool'
  icon = Lasso
  cursor = 'crosshair'
  shortcut = 'L'
  
  // Tool-specific state
  private points: { x: number; y: number }[] = []
  private feedbackPath: Path | null = null
  private finalPath: Path | null = null
  
  /**
   * Override handleMouseDown to initialize points
   */
  protected handleMouseDown(e: { scenePoint: Point }): void {
    super.handleMouseDown(e)
    
    // Initialize points array with the start point
    this.points = [{ x: e.scenePoint.x, y: e.scenePoint.y }]
  }
  
  /**
   * Create visual feedback (path)
   */
  protected createFeedback(): void {
    // For lasso, we create feedback on first drag
  }
  
  /**
   * Update visual feedback during selection
   */
  protected updateFeedback(): void {
    if (!this.canvas) return
    
    const currentPoint = this.state.get('currentPoint')
    if (!currentPoint) return
    
    // Add point to path
    this.points.push(currentPoint)
    
    // Create path data from points
    const pathData = this.createPathData(this.points)
    
    // Update or create feedback path
    if (this.feedbackPath) {
      this.canvas.remove(this.feedbackPath)
    }
    
    this.feedbackPath = new Path(pathData, {
      ...selectionStyle,
      fill: ''
    })
    
    this.canvas.add(this.feedbackPath)
    this.canvas.renderAll()
  }
  
  /**
   * Create SVG path data from points
   */
  private createPathData(points: { x: number; y: number }[]): string {
    if (points.length < 2) return ''
    
    let pathData = `M ${points[0].x} ${points[0].y}`
    
    for (let i = 1; i < points.length; i++) {
      pathData += ` L ${points[i].x} ${points[i].y}`
    }
    
    return pathData
  }
  
  /**
   * Finalize the selection
   */
  protected finalizeSelection(): void {
    if (!this.canvas || this.points.length < 3) {
      // Need at least 3 points for a valid selection
      if (this.feedbackPath && this.canvas) {
        this.canvas.remove(this.feedbackPath)
      }
      return
    }
    
    // Close the path
    const closedPathData = this.createPathData(this.points) + ' Z'
    
    // Remove feedback path
    if (this.feedbackPath) {
      this.canvas.remove(this.feedbackPath)
    }
    
    // Create final selection path
    this.finalPath = new Path(closedPathData, {
      ...selectionStyle
    })
    
    // Get selection manager and mode
    const canvasStore = useCanvasStore.getState()
    const selectionStore = useSelectionStore.getState()
    
    if (!canvasStore.selectionManager || !canvasStore.selectionRenderer) {
      console.error('Selection system not initialized')
      return
    }
    
    // Add the path temporarily to get bounds
    this.canvas.add(this.finalPath)
    
    // Create pixel selection from path
    canvasStore.selectionManager.createFromPath(this.finalPath, selectionStore.mode)
    
    // Update selection state
    const bounds = this.finalPath.getBoundingRect()
    selectionStore.updateSelectionState(true, {
      x: bounds.left,
      y: bounds.top,
      width: bounds.width,
      height: bounds.height
    })
    
    // Remove the temporary path
    this.canvas.remove(this.finalPath)
    
    // Start rendering the selection
    canvasStore.selectionRenderer.startRendering()
    
    console.log('Lasso selection created:', {
      mode: selectionStore.mode,
      pointCount: this.points.length
    })
    
    // Reset for next selection
    this.points = []
    this.feedbackPath = null
    this.finalPath = null
  }
  
  /**
   * Override cleanup
   */
  protected cleanup(canvas: Canvas): void {
    // Clean up feedback path if exists
    if (this.feedbackPath && canvas.contains(this.feedbackPath)) {
      canvas.remove(this.feedbackPath)
    }
    
    // Reset state
    this.points = []
    this.feedbackPath = null
    this.finalPath = null
    
    // Call parent cleanup
    super.cleanup(canvas)
  }
}

// Export singleton instance
export const lassoTool = new LassoTool() 