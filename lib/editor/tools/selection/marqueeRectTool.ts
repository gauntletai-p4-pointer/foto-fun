import { ObjectTool } from '../base/ObjectTool'
import type { ToolEvent, Point, Rect } from '@/lib/editor/canvas/types'
import { Square } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'

/**
 * Marquee Rectangle Tool - Select objects within rectangular area
 * Can also create pixel selections within objects
 */
export class MarqueeRectTool extends ObjectTool {
  // Tool identification
  id = TOOL_IDS.MARQUEE_RECT
  name = 'Rectangular Marquee Tool'
  icon = Square
  cursor = 'crosshair'
  shortcut = 'M'
  
  // Selection state
  private isSelecting = false
  private startPoint: Point | null = null
  private preview: Konva.Rect | null = null
  private overlayLayer: Konva.Layer | null = null
  
  // Selection modes based on modifiers
  private getSelectionMode(event: ToolEvent): 'replace' | 'add' | 'subtract' | 'intersect' {
    if (event.shiftKey && event.altKey) return 'intersect'
    if (event.shiftKey) return 'add'
    if (event.altKey) return 'subtract'
    return 'replace'
  }
  
  protected setupTool(): void {
    // Get or create overlay layer for selection preview
    const stage = this.getCanvas().stage
    this.overlayLayer = stage.findOne('.selection-overlay') as Konva.Layer
    
    if (!this.overlayLayer) {
      this.overlayLayer = new Konva.Layer({ name: 'selection-overlay' })
      stage.add(this.overlayLayer)
    }
    
    // Set default options
    this.setOption('mode', 'object') // 'object' or 'pixel'
    this.setOption('antiAlias', true)
    this.setOption('feather', 0)
  }
  
  protected cleanupTool(): void {
    this.cleanup()
  }
  
  onMouseDown(event: ToolEvent): void {
    this.isSelecting = true
    this.startPoint = event.point
    this.lastMousePosition = event.point
    
    // Create preview rectangle
    const mode = this.getSelectionMode(event)
    this.preview = new Konva.Rect({
      x: event.point.x,
      y: event.point.y,
      width: 0,
      height: 0,
      stroke: this.getModeColor(mode),
      strokeWidth: 1,
      dash: [4, 4],
      fill: this.getModeFill(mode),
      listening: false
    })
    
    if (this.overlayLayer) {
      this.overlayLayer.add(this.preview)
      this.overlayLayer.batchDraw()
    }
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isSelecting || !this.startPoint || !this.preview) return
    
    this.lastMousePosition = event.point
    
    // Calculate bounds
    const bounds = {
      x: Math.min(this.startPoint.x, event.point.x),
      y: Math.min(this.startPoint.y, event.point.y),
      width: Math.abs(event.point.x - this.startPoint.x),
      height: Math.abs(event.point.y - this.startPoint.y)
    }
    
    // Apply constraints if shift is held (square selection)
    if (event.shiftKey) {
      const size = Math.max(bounds.width, bounds.height)
      bounds.width = size
      bounds.height = size
      
      // Adjust position based on drag direction
      if (event.point.x < this.startPoint.x) {
        bounds.x = this.startPoint.x - size
      }
      if (event.point.y < this.startPoint.y) {
        bounds.y = this.startPoint.y - size
      }
    }
    
    // Update preview
    this.preview.setAttrs(bounds)
    
    // Update mode color if modifiers changed
    const mode = this.getSelectionMode(event)
    this.preview.stroke(this.getModeColor(mode))
    this.preview.fill(this.getModeFill(mode))
    
    this.overlayLayer?.batchDraw()
  }
  
  onMouseUp(event: ToolEvent): void {
    if (!this.isSelecting || !this.startPoint || !this.preview) return
    
    // Get final bounds
    const bounds: Rect = {
      x: this.preview.x(),
      y: this.preview.y(),
      width: this.preview.width(),
      height: this.preview.height()
    }
    
    // Skip if too small
    if (bounds.width < 2 || bounds.height < 2) {
      this.cleanup()
      return
    }
    
    const mode = this.getSelectionMode(event)
    const selectionMode = this.getOption('mode') as string
    
    if (selectionMode === 'object') {
      // Select objects within bounds
      this.selectObjectsInBounds(bounds, mode)
    } else {
      // Create pixel selection within selected object
      this.createPixelSelection(bounds)
    }
    
    this.cleanup()
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isSelecting) {
      this.cleanup()
    }
  }
  
  /**
   * Select objects within the marquee bounds
   */
  private selectObjectsInBounds(bounds: Rect, mode: 'replace' | 'add' | 'subtract' | 'intersect'): void {
    const canvas = this.getCanvas()
    const objectsInBounds = canvas.getObjectsInBounds(bounds)
    const currentSelection = Array.from(canvas.state.selectedObjectIds)
    
    let newSelection: string[] = []
    
    switch (mode) {
      case 'replace':
        newSelection = objectsInBounds.map(obj => obj.id)
        break
        
      case 'add':
        newSelection = [...new Set([...currentSelection, ...objectsInBounds.map(obj => obj.id)])]
        break
        
      case 'subtract':
        const toRemove = new Set(objectsInBounds.map(obj => obj.id))
        newSelection = currentSelection.filter(id => !toRemove.has(id))
        break
        
      case 'intersect':
        const inBounds = new Set(objectsInBounds.map(obj => obj.id))
        newSelection = currentSelection.filter(id => inBounds.has(id))
        break
    }
    
    // Update selection
    if (newSelection.length > 0) {
      canvas.selectMultiple(newSelection)
    } else {
      canvas.deselectAll()
    }
  }
  
  /**
   * Create pixel selection within the current object
   */
  private createPixelSelection(bounds: Rect): void {
    const targetObject = this.getTargetObject()
    if (!targetObject || targetObject.type !== 'image') {
      console.warn('Pixel selection requires an image object to be selected')
      return
    }
    
    // Store pixel selection in canvas state
    const canvas = this.getCanvas()
    canvas.state.pixelSelection = {
      type: 'rectangle',
      bounds,
      feather: this.getOption('feather') as number || 0,
      antiAlias: this.getOption('antiAlias') as boolean || true
    }
  }
  
  /**
   * Clean up preview and state
   */
  private cleanup(): void {
    if (this.preview) {
      this.preview.destroy()
      this.preview = null
    }
    
    if (this.overlayLayer) {
      this.overlayLayer.batchDraw()
    }
    
    this.isSelecting = false
    this.startPoint = null
  }
  
  /**
   * Get color based on selection mode
   */
  private getModeColor(mode: 'replace' | 'add' | 'subtract' | 'intersect'): string {
    switch (mode) {
      case 'add': return '#00ff00'
      case 'subtract': return '#ff0000'
      case 'intersect': return '#ffff00'
      default: return '#0096ff'
    }
  }
  
  /**
   * Get fill based on selection mode
   */
  private getModeFill(mode: 'replace' | 'add' | 'subtract' | 'intersect'): string {
    switch (mode) {
      case 'add': return 'rgba(0, 255, 0, 0.1)'
      case 'subtract': return 'rgba(255, 0, 0, 0.1)'
      case 'intersect': return 'rgba(255, 255, 0, 0.1)'
      default: return 'rgba(0, 150, 255, 0.1)'
    }
  }
}

// Export singleton instance for compatibility
export const marqueeRectTool = new MarqueeRectTool() 