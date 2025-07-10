import { Square } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'

/**
 * Rectangular Marquee Tool - Creates rectangular selections
 * Konva implementation with pixel-aware selection
 */
export class MarqueeRectTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.MARQUEE_RECT
  name = 'Rectangular Marquee Tool'
  icon = Square
  cursor = 'crosshair'
  shortcut = 'M'
  
  // Selection state
  private isSelecting = false
  private startPoint: Point | null = null
  private selectionRect: Konva.Rect | null = null
  private selectionLayer: Konva.Layer | null = null
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Create a dedicated layer for selection visualization
    this.selectionLayer = new Konva.Layer()
    canvas.konvaStage.add(this.selectionLayer)
    
    // Move selection layer to top
    this.selectionLayer.moveToTop()
  }
  
  protected cleanupTool(): void {
    // Clean up selection visualization
    if (this.selectionRect) {
      this.selectionRect.destroy()
      this.selectionRect = null
    }
    
    // Clean up selection layer
    if (this.selectionLayer) {
      this.selectionLayer.destroy()
      this.selectionLayer = null
    }
    
    // Reset state
    this.isSelecting = false
    this.startPoint = null
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    if (!this.selectionLayer) return
    
    this.isSelecting = true
    this.startPoint = { x: event.point.x, y: event.point.y }
    
    // Remove any existing selection rect
    if (this.selectionRect) {
      this.selectionRect.destroy()
    }
    
    // Create visual feedback
    this.selectionRect = new Konva.Rect({
      x: event.point.x,
      y: event.point.y,
      width: 0,
      height: 0,
      stroke: '#000000',
      strokeWidth: 1,
      dash: [4, 4],
      fill: 'rgba(0, 0, 0, 0.1)',
      listening: false // Don't interfere with mouse events
    })
    
    this.selectionLayer.add(this.selectionRect)
    this.selectionLayer.batchDraw()
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isSelecting || !this.selectionRect || !this.startPoint || !this.selectionLayer) return
    
    // Calculate bounds
    const bounds = {
      x: Math.min(this.startPoint.x, event.point.x),
      y: Math.min(this.startPoint.y, event.point.y),
      width: Math.abs(event.point.x - this.startPoint.x),
      height: Math.abs(event.point.y - this.startPoint.y)
    }
    
    // Update visual feedback
    this.selectionRect.setAttrs(bounds)
    this.selectionLayer.batchDraw()
  }
  
  async onMouseUp(event: ToolEvent): Promise<void> {
    if (!this.isSelecting || !this.selectionRect || !this.startPoint || !this.selectionLayer) return
    
    this.isSelecting = false
    
    const canvas = this.getCanvas()
    const bounds = {
      x: Math.min(this.startPoint.x, event.point.x),
      y: Math.min(this.startPoint.y, event.point.y),
      width: Math.abs(event.point.x - this.startPoint.x),
      height: Math.abs(event.point.y - this.startPoint.y)
    }
    
    // Only create selection if it has a minimum size
    const minSize = 2
    if (bounds.width >= minSize && bounds.height >= minSize) {
      // Get the selection manager
      const selectionManager = canvas.getSelectionManager()
      
      // Get the current selection mode
      const mode = this.getOption('mode') as 'new' | 'add' | 'subtract' | 'intersect' || 'new'
      const selectionMode = mode === 'new' ? 'replace' : mode
      
      // Create pixel-based rectangular selection
      selectionManager.createRectangle(
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        selectionMode
      )
      
      // The selection events will be emitted by the SelectionManager
    }
    
    // Clean up visual feedback
    this.selectionRect.destroy()
    this.selectionRect = null
    this.selectionLayer.batchDraw()
    
    // Reset state
    this.startPoint = null
  }
  
  onKeyDown(event: KeyboardEvent): void {
    // Handle modifier keys for selection modes
    if (event.key === 'Shift') {
      // Add to selection mode
      this.setOption('mode', 'add')
    } else if (event.key === 'Alt' || event.key === 'Option') {
      // Subtract from selection mode  
      this.setOption('mode', 'subtract')
    }
  }
  
  onKeyUp(event: KeyboardEvent): void {
    // Reset to default mode
    if (event.key === 'Shift' || event.key === 'Alt' || event.key === 'Option') {
      this.setOption('mode', 'new')
    }
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'mode' && this.selectionRect) {
      // Update visual feedback based on mode
      switch (value) {
        case 'add':
          this.selectionRect.stroke('#00ff00')
          break
        case 'subtract':
          this.selectionRect.stroke('#ff0000')
          break
        default:
          this.selectionRect.stroke('#000000')
      }
      this.selectionLayer?.batchDraw()
    }
  }
}

// Export singleton instance
export const marqueeRectTool = new MarqueeRectTool() 