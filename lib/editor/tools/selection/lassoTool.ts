import { Lasso } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, TPointerEventInfo } from 'fabric'
import { Path } from 'fabric'
import { SelectionTool } from '../base/SelectionTool'
import { selectionStyle } from '../utils/selectionRenderer'
import { useCanvasStore } from '@/store/canvasStore'
import { useSelectionStore } from '@/store/selectionStore'
import { useHistoryStore } from '@/store/historyStore'
import { CreateSelectionCommand } from '@/lib/editor/commands/selection'

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
  private lastUpdateTime = 0
  private updateThrottle = 16 // ~60fps
  
  /**
   * Override handleMouseDown to initialize points
   */
  protected handleMouseDown(e: TPointerEventInfo<MouseEvent>): void {
    super.handleMouseDown(e)
    
    // Use Fabric's getPointer method to get the correct transformed coordinates
    const pointer = this.canvas!.getPointer(e.e)
    
    // Initialize points array with the start point
    this.points = [{ x: pointer.x, y: pointer.y }]
    this.lastUpdateTime = 0
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
    
    // Throttle visual updates to avoid excessive canvas events
    const now = Date.now()
    if (now - this.lastUpdateTime < this.updateThrottle) {
      return
    }
    this.lastUpdateTime = now
    
    // Create path data from points
    const pathData = this.createPathData(this.points)
    
    // Update feedback path
    if (this.feedbackPath) {
      this.canvas.remove(this.feedbackPath)
    }
    
    this.feedbackPath = new Path(pathData, {
      ...selectionStyle,
      fill: '',
      excludeFromExport: true,  // Mark as temporary feedback
      selectable: false,
      evented: false
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
    
    // Remove feedback path first
    if (this.feedbackPath) {
      this.canvas.remove(this.feedbackPath)
      this.feedbackPath = null
    }
    
    // Close the path with all collected points
    const closedPathData = this.createPathData(this.points) + ' Z'
    
    // Create final selection path with all points
    this.finalPath = new Path(closedPathData, {
      ...selectionStyle,
      excludeFromExport: true  // This is temporary for selection creation
    })
    
    // Get selection manager
    const canvasStore = useCanvasStore.getState()
    const selectionManager = canvasStore.selectionManager
    
    if (!selectionManager) {
      console.error('Selection system not initialized')
      return
    }
    
    // Add the path temporarily to canvas for selection creation
    this.canvas.add(this.finalPath)
    
    // Get selection mode (new, add, subtract, intersect)
    const mode = this.selectionMode
    
    // Create the selection from path - the base SelectionTool has already set up
    // the correct selection mode (object vs global) in the selection manager
    selectionManager.createFromPath(
      this.finalPath,
      mode === 'new' ? 'replace' : mode
    )
    
    // If in object mode, the LayerAwareSelectionManager will automatically
    // clip the selection to object bounds and store it as an object selection
    
    // Record command for undo/redo
    const selection = selectionManager.getSelection()
    if (selection) {
      const command = new CreateSelectionCommand(selectionManager, selection, mode === 'new' ? 'replace' : mode)
      this.historyStore.executeCommand(command)
      
      // Update selection store
      const bounds = this.finalPath.getBoundingRect()
      this.selectionStore.updateSelectionState(true, {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height
      })
      
      // Start rendering the selection with marching ants
      const { selectionRenderer } = canvasStore
      if (selectionRenderer) {
        selectionRenderer.startRendering()
      }
    }
    
    // Clean up
    if (this.finalPath) this.canvas.remove(this.finalPath)
    
    this.feedbackPath = null
    this.finalPath = null
    this.points = []
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