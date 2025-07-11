import { Lasso } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { ObjectTool } from '../base/ObjectTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'

/**
 * Lasso Tool - Creates freehand selections for objects
 * Selects objects within the lasso path or pixels within a single object
 */
export class LassoTool extends ObjectTool {
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
  private selectionGroup: Konva.Group | null = null
  private minDistance = 3 // Minimum distance between points for smoothing
  
  protected setupTool(): void {
    // No setup needed - we'll use the overlay layer when needed
  }
  
  protected cleanupTool(): void {
    // Clean up selection visualization
    this.cleanupSelection()
    
    // Reset state
    this.isSelecting = false
    this.points = []
    this.selectionPath = null
    this.selectionGroup = null
  }
  
  onMouseDown(event: ToolEvent): void {
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    // Use the existing overlay layer
    const overlayLayer = stage.children[2] as Konva.Layer
    if (!overlayLayer) return
    
    this.isSelecting = true
    this.points = [{ x: event.point.x, y: event.point.y }]
    
    // Create a group for this selection
    this.selectionGroup = new Konva.Group({ name: 'lassoSelection' })
    overlayLayer.add(this.selectionGroup)
    
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
    
    this.selectionGroup.add(bgPath)
    this.selectionGroup.add(this.selectionPath)
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isSelecting || !this.selectionPath || !this.selectionGroup) return
    
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    const overlayLayer = stage.children[2] as Konva.Layer
    if (!overlayLayer) return
    
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
      const bgPath = this.selectionGroup.children[0] as Konva.Line
      if (bgPath) {
        bgPath.points(flatPoints)
      }
      
      overlayLayer.batchDraw()
    }
  }
  
  async onMouseUp(_event: ToolEvent): Promise<void> {
    if (!this.isSelecting || !this.selectionPath || !this.selectionGroup || this.points.length < 3) {
      // Need at least 3 points for a valid selection
      this.cleanupSelection()
      return
    }
    
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    const overlayLayer = stage.children[2] as Konva.Layer
    if (!overlayLayer) return
    
    this.isSelecting = false
    
    // Close the path
    this.selectionPath.closed(true)
    const bgPath = this.selectionGroup.children[0] as Konva.Line
    if (bgPath) {
      bgPath.closed(true)
    }
    overlayLayer.batchDraw()
    
    // Get the current selection mode
    const mode = this.getOption('mode') as 'new' | 'add' | 'subtract' | 'intersect' || 'new'
    const pixelMode = this.getOption('pixelMode') as boolean || false
    
    if (pixelMode && this.getTargetObject()) {
      // Pixel selection within the selected object
      await this.createPixelSelection(mode)
    } else {
      // Object selection
      await this.selectObjectsInPath(mode)
    }
    
    // Clean up visual feedback
    this.cleanupSelection()
  }
  
  /**
   * Select objects that are within the lasso path
   */
  private async selectObjectsInPath(mode: 'new' | 'add' | 'subtract' | 'intersect'): Promise<void> {
    const canvas = this.getCanvas()
    const objects = canvas.getAllObjects()
    const selectedIds: string[] = []
    
    // Check each object to see if it's within the path
    for (const object of objects) {
      if (object.locked || !object.visible) continue
      
      // Check if object center is within the lasso path
      const centerX = object.x + object.width / 2
      const centerY = object.y + object.height / 2
      
      if (this.isPointInPath(centerX, centerY)) {
        selectedIds.push(object.id)
      }
    }
    
    // Apply selection based on mode
    const currentSelection = Array.from(canvas.state.selectedObjectIds)
    let finalSelection: string[] = []
    
    switch (mode) {
      case 'new':
        finalSelection = selectedIds
        break
      case 'add':
        finalSelection = [...new Set([...currentSelection, ...selectedIds])]
        break
      case 'subtract':
        finalSelection = currentSelection.filter(id => !selectedIds.includes(id))
        break
      case 'intersect':
        finalSelection = currentSelection.filter(id => selectedIds.includes(id))
        break
    }
    
    // Update selection
    if (finalSelection.length === 0) {
      canvas.deselectAll()
    } else if (finalSelection.length === 1) {
      canvas.selectObject(finalSelection[0])
    } else {
      canvas.selectMultiple(finalSelection)
    }
  }
  
  /**
   * Create pixel selection within the selected object
   */
  private async createPixelSelection(mode: 'new' | 'add' | 'subtract' | 'intersect'): Promise<void> {
    const canvas = this.getCanvas()
    const targetObject = this.getTargetObject()
    
    if (!targetObject || targetObject.type !== 'image') {
      console.warn('[LassoTool] Pixel selection requires an image object')
      return
    }
    
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
    
    // Create pixel selection
    const selectionManager = canvas.getSelectionManager()
    const selectionMode = mode === 'new' ? 'replace' : mode
    selectionManager.createFromPath(pathData, selectionMode)
  }
  
  /**
   * Check if a point is inside the lasso path
   */
  private isPointInPath(x: number, y: number): boolean {
    // Ray casting algorithm
    let inside = false
    const n = this.points.length
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = this.points[i].x
      const yi = this.points[i].y
      const xj = this.points[j].x
      const yj = this.points[j].y
      
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
      
      if (intersect) inside = !inside
    }
    
    return inside
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
    if (this.selectionGroup) {
      this.selectionGroup.destroy()
      this.selectionGroup = null
      
      // Redraw the overlay layer
      const canvas = this.getCanvas()
      const stage = canvas.konvaStage
      const overlayLayer = stage.children[2] as Konva.Layer
      if (overlayLayer) {
        overlayLayer.batchDraw()
      }
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
    
    // Get the current selection mode
    const mode = this.getOption('mode') as 'new' | 'add' | 'subtract' | 'intersect' || 'new'
    const pixelMode = this.getOption('pixelMode') as boolean || false
    
    if (pixelMode && this.getTargetObject()) {
      await this.createPixelSelection(mode)
    } else {
      await this.selectObjectsInPath(mode)
    }
  }
}

// Export singleton instance
export const lassoTool = new LassoTool() 