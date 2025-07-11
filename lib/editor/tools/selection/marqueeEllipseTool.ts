import { BaseSelectionTool } from '../base/BaseSelectionTool'
import { ToolEvent, Point } from '@/types'
import { TOOL_IDS } from '@/constants'
import Konva from 'konva'
import type { ComponentType } from 'react'
import { Circle } from 'lucide-react'

export class MarqueeEllipseTool extends BaseSelectionTool {
  public readonly id = TOOL_IDS.MARQUEE_ELLIPSE
  public readonly name = 'Elliptical Marquee Tool'
  public readonly icon: ComponentType<Record<string, never>> = Circle
  public readonly cursor = 'crosshair'
  public readonly shortcut = 'M'
  
  private previewEllipse: Konva.Ellipse | null = null
  private antiAlias = true
  
  protected setupTool(): void {
    // Tool is ready
  }
  
  protected cleanupTool(): void {
    this.clearPreview()
  }
  
  onMouseDown(event: ToolEvent): void {
    if (!this.canvas) return
    
    this.isCreating = true
    this.startPoint = { ...event.point }
    
    // Create preview
    this.createPreview(event)
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isCreating || !this.startPoint) return
    
    this.updatePreview(event)
  }
  
  onMouseUp(event: ToolEvent): void {
    if (!this.isCreating || !this.startPoint) return
    
    const bounds = this.calculateBounds(this.startPoint, event.point, event)
    
    if (bounds.width > 0 && bounds.height > 0) {
      const mask = this.createSelectionMask(bounds)
      const mode = this.getSelectionMode(event)
      this.finalizeSelection(mask, mode)
    }
    
    this.cleanup()
  }
  
  protected createSelectionMask(bounds: { x: number; y: number; width: number; height: number }): ImageData {
    if (!this.canvas) throw new Error('Canvas not initialized')
    
    const canvasElement = this.canvas.konvaStage.container().querySelector('canvas')
    if (!canvasElement) throw new Error('Canvas element not found')
    
    // Create temporary canvas for mask
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvasElement.width
    tempCanvas.height = canvasElement.height
    const ctx = tempCanvas.getContext('2d', { willReadFrequently: true })
    
    if (!ctx) throw new Error('Could not create canvas context')
    
    // Clear canvas
    ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
    
    // Draw ellipse
    ctx.beginPath()
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    const radiusX = bounds.width / 2
    const radiusY = bounds.height / 2
    
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
    ctx.closePath()
    
    // Fill with white (selected)
    ctx.fillStyle = 'white'
    ctx.fill()
    
    // Apply anti-aliasing
    if (this.antiAlias) {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
    }
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
    
    // Convert to selection format (alpha channel)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      // Use red channel as selection value
      data[i + 3] = data[i]
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
    }
    
    return imageData
  }
  
  private createPreview(event: ToolEvent): void {
    if (!this.startPoint) return
    
    const mode = this.getSelectionMode(event)
    const color = this.getModeColor(mode)
    
    this.previewEllipse = new Konva.Ellipse({
      x: this.startPoint.x,
      y: this.startPoint.y,
      radiusX: 0,
      radiusY: 0,
      stroke: color,
      strokeWidth: 1,
      dash: [5, 5],
      listening: false
    })
    
    this.updateVisualFeedback(this.previewEllipse)
  }
  
  private updatePreview(event: ToolEvent): void {
    if (!this.previewEllipse || !this.startPoint) return
    
    const bounds = this.calculateBounds(this.startPoint, event.point, event)
    const mode = this.getSelectionMode(event)
    const color = this.getModeColor(mode)
    
    this.previewEllipse.setAttrs({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
      radiusX: bounds.width / 2,
      radiusY: bounds.height / 2,
      stroke: color
    })
    
    this.overlayLayer?.batchDraw()
  }
  
  private clearPreview(): void {
    if (this.previewEllipse) {
      this.previewEllipse.destroy()
      this.previewEllipse = null
    }
  }
  
  private calculateBounds(start: Point, end: Point, event: ToolEvent): { x: number; y: number; width: number; height: number } {
    const x = Math.min(start.x, end.x)
    const y = Math.min(start.y, end.y)
    const width = Math.abs(end.x - start.x)
    const height = Math.abs(end.y - start.y)
    
    const bounds = { x, y, width, height }
    return this.applyConstraints(bounds, event)
  }
  
  getToolOptions() {
    return {
      antiAlias: {
        type: 'checkbox' as const,
        label: 'Anti-alias',
        value: this.antiAlias,
        onChange: (value: boolean) => {
          this.antiAlias = value
        }
      }
    }
  }
}

export const marqueeEllipseTool = new MarqueeEllipseTool(); 