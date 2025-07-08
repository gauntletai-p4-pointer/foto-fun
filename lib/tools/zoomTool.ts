import { ZoomIn } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { Point } from 'fabric'
import { BaseTool } from './base/BaseTool'
import { createToolState } from './utils/toolState'

// Zoom tool state
type ZoomToolState = {
  isAltPressed: boolean
}

/**
 * Zoom Tool - Click to zoom in/out of the canvas
 * Extends BaseTool for consistent tool behavior
 */
class ZoomTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.ZOOM
  name = 'Zoom Tool'
  icon = ZoomIn
  cursor = 'zoom-in'
  shortcut = 'Z'
  
  // Encapsulated state
  private state = createToolState<ZoomToolState>({
    isAltPressed: false
  })
  
  /**
   * Get zoom step from options
   */
  private get zoomStep(): number {
    const zoomStepPercent = this.toolOptionsStore.getOptionValue<number>(this.id, 'zoomStep') ?? 25
    return zoomStepPercent / 100
  }
  
  /**
   * Tool setup
   */
  protected setupTool(canvas: Canvas): void {
    // Disable object selection
    canvas.selection = false
    canvas.defaultCursor = 'zoom-in'
    canvas.hoverCursor = 'zoom-in'
    
    // Make all objects non-selectable
    canvas.forEachObject((obj) => {
      obj.selectable = false
      obj.evented = false
    })
    
    // Set up event handlers
    this.addCanvasEvent('mouse:down', (e: unknown) => {
      const event = e as { e: MouseEvent; scenePoint: { x: number; y: number } }
      this.handleClick(event)
    })
    
    // Add keyboard listeners for Alt key
    this.addEventListener(window, 'keydown', this.handleKeyDown.bind(this))
    this.addEventListener(window, 'keyup', this.handleKeyUp.bind(this))
    
    canvas.renderAll()
  }
  
  /**
   * Tool cleanup
   */
  protected cleanup(canvas: Canvas): void {
    // Reset cursor
    canvas.defaultCursor = 'default'
    canvas.hoverCursor = 'move'
    
    // Reset state
    this.state.reset()
    
    canvas.renderAll()
  }
  
  /**
   * Handle click to zoom
   */
  private handleClick(e: { e: MouseEvent; scenePoint: { x: number; y: number } }): void {
    if (!this.canvas) return
    
    this.track('zoom', () => {
      const point = new Point(e.scenePoint.x, e.scenePoint.y)
      
      // Check if Alt is pressed for zoom out
      const isZoomOut = e.e.altKey || this.state.get('isAltPressed')
      
      // Calculate new zoom level
      const currentZoom = this.canvas!.getZoom()
      const zoomFactor = isZoomOut ? (1 - this.zoomStep) : (1 + this.zoomStep)
      const newZoom = currentZoom * zoomFactor
      
      // Apply zoom limits
      const minZoom = 0.01 // 1%
      const maxZoom = 32   // 3200%
      const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom))
      
      // Zoom to the clicked point
      this.canvas!.zoomToPoint(point, clampedZoom)
      
      // Update the store
      this.canvasStore.setZoom(clampedZoom)
      
      this.canvas!.renderAll()
    })
  }
  
  /**
   * Handle key down for Alt modifier
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.altKey && !this.state.get('isAltPressed')) {
      this.state.set('isAltPressed', true)
      if (this.canvas) {
        this.canvas.defaultCursor = 'zoom-out'
        this.canvas.hoverCursor = 'zoom-out'
      }
    }
  }
  
  /**
   * Handle key up for Alt modifier
   */
  private handleKeyUp(e: KeyboardEvent): void {
    if (!e.altKey && this.state.get('isAltPressed')) {
      this.state.set('isAltPressed', false)
      if (this.canvas) {
        this.canvas.defaultCursor = 'zoom-in'
        this.canvas.hoverCursor = 'zoom-in'
      }
    }
  }
}

// Export singleton instance
export const zoomTool = new ZoomTool() 