import { ObjectTool } from '../base/ObjectTool'
import type { ToolEvent, Point, Rect } from '@/lib/editor/canvas/types'
import { Circle } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'

/**
 * Marquee Ellipse Tool - Select objects within elliptical area
 * Can also create pixel selections within objects
 */
export class MarqueeEllipseTool extends ObjectTool {
  // Tool identification
  id = TOOL_IDS.MARQUEE_ELLIPSE
  name = 'Elliptical Marquee Tool'
  icon = Circle
  cursor = 'crosshair'
  shortcut = 'M'
  
  // Selection state
  private isSelecting = false
  private startPoint: Point | null = null
  private preview: Konva.Ellipse | null = null
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
    
    // Create preview ellipse
    const mode = this.getSelectionMode(event)
    this.preview = new Konva.Ellipse({
      x: event.point.x,
      y: event.point.y,
      radiusX: 0,
      radiusY: 0,
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
    const bounds = this.calculateBounds(this.startPoint, event.point, event)
    
    // Update preview
    this.preview.setAttrs({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
      radiusX: bounds.width / 2,
      radiusY: bounds.height / 2
    })
    
    // Update mode color if modifiers changed
    const mode = this.getSelectionMode(event)
    this.preview.stroke(this.getModeColor(mode))
    this.preview.fill(this.getModeFill(mode))
    
    this.overlayLayer?.batchDraw()
  }
  
  onMouseUp(event: ToolEvent): void {
    if (!this.isSelecting || !this.startPoint || !this.preview) return
    
    // Get final bounds
    const bounds = this.calculateBounds(this.startPoint, event.point, event)
    
    // Skip if too small
    if (bounds.width < 2 || bounds.height < 2) {
      this.cleanup()
      return
    }
    
    const mode = this.getSelectionMode(event)
    const selectionMode = this.getOption('mode') as string
    
    if (selectionMode === 'object') {
      // Select objects within ellipse
      this.selectObjectsInEllipse(bounds, mode)
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
   * Calculate bounds from start and end points
   */
  private calculateBounds(start: Point, end: Point, event: ToolEvent): Rect {
    let x = Math.min(start.x, end.x)
    let y = Math.min(start.y, end.y)
    let width = Math.abs(end.x - start.x)
    let height = Math.abs(end.y - start.y)
    
    // Apply constraints if shift is held (circular selection)
    if (event.shiftKey) {
      const size = Math.max(width, height)
      width = size
      height = size
      
      // Adjust position based on drag direction
      if (end.x < start.x) {
        x = start.x - size
      }
      if (end.y < start.y) {
        y = start.y - size
      }
    }
    
    return { x, y, width, height }
  }
  
  /**
   * Select objects within the ellipse bounds
   */
  private selectObjectsInEllipse(bounds: Rect, mode: 'replace' | 'add' | 'subtract' | 'intersect'): void {
    const canvas = this.getCanvas()
    const allObjects = canvas.getAllObjects()
    const currentSelection = Array.from(canvas.state.selectedObjectIds)
    
    // Calculate ellipse center and radii
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    const radiusX = bounds.width / 2
    const radiusY = bounds.height / 2
    
    // Find objects within ellipse
    const objectsInEllipse = allObjects.filter(obj => {
      // Check if object center is within ellipse
      const objCenterX = obj.x + (obj.width * obj.scaleX) / 2
      const objCenterY = obj.y + (obj.height * obj.scaleY) / 2
      
      // Ellipse equation: ((x-h)²/a²) + ((y-k)²/b²) ≤ 1
      const dx = (objCenterX - centerX) / radiusX
      const dy = (objCenterY - centerY) / radiusY
      return (dx * dx + dy * dy) <= 1
    })
    
    let newSelection: string[] = []
    
    switch (mode) {
      case 'replace':
        newSelection = objectsInEllipse.map(obj => obj.id)
        break
        
      case 'add':
        newSelection = [...new Set([...currentSelection, ...objectsInEllipse.map(obj => obj.id)])]
        break
        
      case 'subtract':
        const toRemove = new Set(objectsInEllipse.map(obj => obj.id))
        newSelection = currentSelection.filter(id => !toRemove.has(id))
        break
        
      case 'intersect':
        const inEllipse = new Set(objectsInEllipse.map(obj => obj.id))
        newSelection = currentSelection.filter(id => inEllipse.has(id))
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
      type: 'ellipse',
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
export const marqueeEllipseTool = new MarqueeEllipseTool() 