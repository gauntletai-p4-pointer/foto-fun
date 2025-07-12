import { ZoomIn } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'
import { NAVIGATION_TOOL_REQUIREMENTS } from '../base/ToolRequirements'

/**
 * Zoom Tool - Canvas zoom control
 * Konva implementation with click zoom and marquee zoom
 * Works without a document
 */
export class ZoomTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.ZOOM
  name = 'Zoom Tool'
  icon = ZoomIn
  cursor = 'zoom-in'
  shortcut = 'Z'
  
  // Navigation tools don't need a document
  protected requirements = NAVIGATION_TOOL_REQUIREMENTS
  
  // Zoom state
  private isDrawingMarquee = false
  private marqueeStart: Point | null = null
  private marqueeRect: HTMLDivElement | null = null
  
  // Zoom settings
  private readonly ZOOM_STEP = 0.2
  private readonly MIN_ZOOM = 0.1
  private readonly MAX_ZOOM = 10
  
  protected setupTool(): void {
    // Set default zoom mode
    this.setOption('zoomMode', 'in') // 'in' or 'out'
  }
  
  protected cleanupTool(): void {
    // Clean up marquee if active
    if (this.marqueeRect) {
      this.marqueeRect.remove()
      this.marqueeRect = null
    }
    
    // Reset state
    this.isDrawingMarquee = false
    this.marqueeStart = null
  }
  
  onMouseDown(event: ToolEvent): void {
    
    if (event.altKey) {
      // Alt+click for zoom out
      this.zoomOut(event.screenPoint)
    } else {
      // Start marquee zoom or click zoom
      this.marqueeStart = { ...event.screenPoint }
      this.isDrawingMarquee = true
      
      // Create marquee div
      this.createMarquee(event.screenPoint)
    }
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isDrawingMarquee || !this.marqueeStart || !this.marqueeRect) return
    
    // Update marquee size
    const x = Math.min(this.marqueeStart.x, event.screenPoint.x)
    const y = Math.min(this.marqueeStart.y, event.screenPoint.y)
    const width = Math.abs(event.screenPoint.x - this.marqueeStart.x)
    const height = Math.abs(event.screenPoint.y - this.marqueeStart.y)
    
    this.marqueeRect.style.left = `${x}px`
    this.marqueeRect.style.top = `${y}px`
    this.marqueeRect.style.width = `${width}px`
    this.marqueeRect.style.height = `${height}px`
  }
  
  onMouseUp(event: ToolEvent): void {
    if (!this.isDrawingMarquee || !this.marqueeStart) return
    
    // Calculate marquee bounds
    const width = Math.abs(event.screenPoint.x - this.marqueeStart.x)
    const height = Math.abs(event.screenPoint.y - this.marqueeStart.y)
    
    if (width < 5 && height < 5) {
      // Click zoom
      const zoomMode = this.getOption('zoomMode') as string
      if (zoomMode === 'out' || event.altKey) {
        this.zoomOut(event.screenPoint)
      } else {
        this.zoomIn(event.screenPoint)
      }
    } else {
      // Marquee zoom
      this.marqueeZoom()
    }
    
    // Clean up
    if (this.marqueeRect) {
      this.marqueeRect.remove()
      this.marqueeRect = null
    }
    
    this.isDrawingMarquee = false
    this.marqueeStart = null
  }
  
  onKeyDown(event: KeyboardEvent): void {
    const canvas = this.getCanvas()
    
    // Alt key switches to zoom out
    if (event.key === 'Alt') {
      canvas.stage.container().style.cursor = 'zoom-out'
      this.setOption('zoomMode', 'out')
    }
    
    // Keyboard shortcuts for zoom
    if (event.ctrlKey || event.metaKey) {
      if (event.key === '=' || event.key === '+') {
        event.preventDefault()
        this.zoomIn()
      } else if (event.key === '-') {
        event.preventDefault()
        this.zoomOut()
      } else if (event.key === '0') {
        event.preventDefault()
        this.resetZoom()
      }
    }
  }
  
  onKeyUp(event: KeyboardEvent): void {
    const canvas = this.getCanvas()
    
    // Release Alt key switches back to zoom in
    if (event.key === 'Alt') {
      canvas.stage.container().style.cursor = 'zoom-in'
      this.setOption('zoomMode', 'in')
    }
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'zoomMode') {
      const canvas = this.getCanvas()
      canvas.stage.container().style.cursor = value === 'out' ? 'zoom-out' : 'zoom-in'
    }
  }
  
  /**
   * Create marquee selection div
   */
  private createMarquee(point: Point): void {
    // Remove existing marquee if any
    if (this.marqueeRect) {
      this.marqueeRect.remove()
    }
    
    // Create new marquee
    this.marqueeRect = document.createElement('div')
    this.marqueeRect.style.position = 'fixed'
    this.marqueeRect.style.left = `${point.x}px`
    this.marqueeRect.style.top = `${point.y}px`
    this.marqueeRect.style.width = '0px'
    this.marqueeRect.style.height = '0px'
    this.marqueeRect.style.border = '1px dashed #666'
    this.marqueeRect.style.backgroundColor = 'rgba(0, 0, 0, 0.1)'
    this.marqueeRect.style.pointerEvents = 'none'
    this.marqueeRect.style.zIndex = '9999'
    
    document.body.appendChild(this.marqueeRect)
  }
  
  /**
   * Zoom in at point or center
   */
  private zoomIn(point?: Point): void {
    const canvas = this.getCanvas()
    const currentZoom = canvas.state.zoom
    const newZoom = Math.min(currentZoom * (1 + this.ZOOM_STEP), this.MAX_ZOOM)
    
    if (point) {
      // Zoom to point
      this.zoomToPoint(point, newZoom)
    } else {
      // Zoom to center
      const stage = canvas.stage
      const centerPoint = {
        x: stage.width() / 2,
        y: stage.height() / 2
      }
      this.zoomToPoint(centerPoint, newZoom)
    }
  }
  
  /**
   * Zoom out at point or center
   */
  private zoomOut(point?: Point): void {
    const canvas = this.getCanvas()
    const currentZoom = canvas.state.zoom
    const newZoom = Math.max(currentZoom / (1 + this.ZOOM_STEP), this.MIN_ZOOM)
    
    if (point) {
      // Zoom from point
      this.zoomToPoint(point, newZoom)
    } else {
      // Zoom from center
      const stage = canvas.stage
      const centerPoint = {
        x: stage.width() / 2,
        y: stage.height() / 2
      }
      this.zoomToPoint(centerPoint, newZoom)
    }
  }
  
  /**
   * Reset zoom to 100%
   */
  private resetZoom(): void {
    const canvas = this.getCanvas()
    canvas.setZoom(1)
    canvas.setPan({ x: 0, y: 0 })
  }
  
  /**
   * Zoom to specific point (in screen coordinates)
   */
  private zoomToPoint(screenPoint: Point, newZoom: number): void {
    const canvas = this.getCanvas()
    const oldZoom = canvas.state.zoom
    const oldPan = canvas.state.pan
    
    // Convert screen point to world coordinates before zoom
    const worldPoint = {
      x: (screenPoint.x - oldPan.x) / oldZoom,
      y: (screenPoint.y - oldPan.y) / oldZoom
    }
    
    // Calculate new pan to keep the world point at the same screen position
    const newPan = {
      x: screenPoint.x - worldPoint.x * newZoom,
      y: screenPoint.y - worldPoint.y * newZoom
    }
    
    // Apply zoom and pan
    canvas.setZoom(newZoom)
    canvas.setPan(newPan)
  }
  
  /**
   * Zoom to fit marquee selection
   */
  private marqueeZoom(): void {
    if (!this.marqueeRect || !this.marqueeStart) return
    
    const canvas = this.getCanvas()
    const stage = canvas.stage
    
    // Get marquee bounds in screen coordinates
    const rect = this.marqueeRect.getBoundingClientRect()
    const stageRect = stage.container().getBoundingClientRect()
    
    // Get current zoom and pan
    const currentZoom = canvas.state.zoom
    const currentPan = canvas.state.pan
    
    // Convert marquee screen coordinates to canvas coordinates
    const marqueeScreenBounds = {
      x: rect.left - stageRect.left,
      y: rect.top - stageRect.top,
      width: rect.width,
      height: rect.height
    }
    
    // Convert to world coordinates
    const worldBounds = {
      x: (marqueeScreenBounds.x - currentPan.x) / currentZoom,
      y: (marqueeScreenBounds.y - currentPan.y) / currentZoom,
      width: marqueeScreenBounds.width / currentZoom,
      height: marqueeScreenBounds.height / currentZoom
    }
    
    // Calculate zoom to fit the marquee area in the viewport
    const stageWidth = stage.width()
    const stageHeight = stage.height()
    
    const scaleX = stageWidth / worldBounds.width
    const scaleY = stageHeight / worldBounds.height
    const newZoom = Math.min(scaleX, scaleY, this.MAX_ZOOM) * 0.9 // 90% to add some padding
    
    // Calculate center of marquee in world coordinates
    const worldCenter = {
      x: worldBounds.x + worldBounds.width / 2,
      y: worldBounds.y + worldBounds.height / 2
    }
    
    // Calculate new pan to center the marquee
    const newPan = {
      x: stageWidth / 2 - worldCenter.x * newZoom,
      y: stageHeight / 2 - worldCenter.y * newZoom
    }
    
    // Apply zoom and pan
    canvas.setZoom(newZoom)
    canvas.setPan(newPan)
  }
  
  /**
   * Set zoom level for AI operations
   */
  async setZoomLevel(zoom: number, center?: Point): Promise<void> {
    const canvas = this.getCanvas()
    const clampedZoom = Math.max(this.MIN_ZOOM, Math.min(zoom, this.MAX_ZOOM))
    
    if (center) {
      this.zoomToPoint(center, clampedZoom)
    } else {
      canvas.setZoom(clampedZoom)
    }
  }
  
  /**
   * Fit canvas to screen
   */
  async fitToScreen(): Promise<void> {
    const canvas = this.getCanvas()
    canvas.fitToScreen()
  }
}

// Export singleton instance
export const zoomTool = new ZoomTool() 