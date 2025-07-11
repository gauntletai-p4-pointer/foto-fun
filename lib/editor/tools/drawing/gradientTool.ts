import { Palette } from 'lucide-react'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point, CanvasManager } from '@/lib/editor/canvas/types'
import { TOOL_IDS } from '@/constants'
import Konva from 'konva'

/**
 * Gradient Tool
 * Supports Linear, Radial, Angle, Reflected, and Diamond gradients
 */
export class GradientTool extends BaseTool {
  id = TOOL_IDS.GRADIENT
  name = 'Gradient Tool'
  icon = Palette
  cursor = 'crosshair'
  shortcut = 'G'
  
  // Gradient settings
  private gradientType: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond' = 'linear'
  private gradientStops: Array<{ offset: number; color: string; opacity: number }> = [
    { offset: 0, color: '#000000', opacity: 1 },
    { offset: 1, color: '#FFFFFF', opacity: 1 }
  ]
  private blendMode: GlobalCompositeOperation = 'source-over'
  private opacity = 100
  private reverse = false
  private dither = true
  
  // Drawing state
  private isDrawing = false
  private startPoint: Point | null = null
  private endPoint: Point | null = null
  private previewLayer: Konva.Layer | null = null
  private gradientShape: Konva.Rect | null = null
  
  protected setupTool(): void {
    // Create preview layer
    const canvas = this.getCanvas()
    this.previewLayer = new Konva.Layer()
    // Get stage from canvas internals
    const stage = (canvas as any).stage
    if (stage) {
      stage.add(this.previewLayer)
    }
  }
  
  protected cleanupTool(): void {
    // Remove preview layer
    if (this.previewLayer) {
      this.previewLayer.destroy()
      this.previewLayer = null
    }
  }
  
  /**
   * Get tool-specific options
   */
  getToolOptions(): Record<string, any> {
    return {
      gradientType: {
        type: 'select',
        label: 'Type',
        value: this.gradientType,
        options: [
          { value: 'linear', label: 'Linear' },
          { value: 'radial', label: 'Radial' },
          { value: 'angle', label: 'Angle' },
          { value: 'reflected', label: 'Reflected' },
          { value: 'diamond', label: 'Diamond' }
        ],
        onChange: (value: string) => {
          this.gradientType = value as typeof this.gradientType
          this.updatePreview()
        }
      },
      opacity: {
        type: 'slider',
        label: 'Opacity',
        value: this.opacity,
        min: 0,
        max: 100,
        onChange: (value: number) => {
          this.opacity = value
          this.updatePreview()
        }
      },
      blendMode: {
        type: 'select',
        label: 'Mode',
        value: this.blendMode,
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'multiply', label: 'Multiply' },
          { value: 'screen', label: 'Screen' },
          { value: 'overlay', label: 'Overlay' },
          { value: 'darken', label: 'Darken' },
          { value: 'lighten', label: 'Lighten' }
        ],
        onChange: (value: string) => {
          this.blendMode = value as GlobalCompositeOperation
          this.updatePreview()
        }
      },
      reverse: {
        type: 'toggle',
        label: 'Reverse',
        value: this.reverse,
        onChange: (value: boolean) => {
          this.reverse = value
          this.updatePreview()
        }
      },
      dither: {
        type: 'toggle',
        label: 'Dither',
        value: this.dither,
        onChange: (value: boolean) => {
          this.dither = value
          this.updatePreview()
        }
      },
      gradientEditor: {
        type: 'custom',
        label: 'Gradient',
        component: 'GradientEditor',
        value: this.gradientStops,
        onChange: (stops: typeof this.gradientStops) => {
          this.gradientStops = stops
          this.updatePreview()
        }
      }
    }
  }
  
  onMouseDown(event: ToolEvent): void {
    this.isDrawing = true
    this.startPoint = event.point
    this.endPoint = event.point
    
    // Create gradient shape
    this.createGradientPreview()
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isDrawing || !this.startPoint) return
    
    this.endPoint = event.point
    this.updatePreview()
  }
  
  onMouseUp(_event: ToolEvent): void {
    if (!this.isDrawing || !this.startPoint || !this.endPoint) return
    
    this.isDrawing = false
    
    // Apply gradient to canvas
    this.applyGradient()
    
    // Clear preview
    this.clearPreview()
    
    // Reset points
    this.startPoint = null
    this.endPoint = null
  }
  
  /**
   * Create gradient preview shape
   */
  private createGradientPreview(): void {
    if (!this.previewLayer) return
    
    const canvas = this.getCanvas()
    // Get stage from canvas internals
    const stage = (canvas as any).stage
    if (!stage) return
    
    // Create rectangle covering entire canvas
    this.gradientShape = new Konva.Rect({
      x: 0,
      y: 0,
      width: stage.width(),
      height: stage.height(),
      opacity: this.opacity / 100
    })
    
    this.previewLayer.add(this.gradientShape)
    this.updatePreview()
  }
  
  /**
   * Update gradient preview
   */
  private updatePreview(): void {
    if (!this.gradientShape || !this.startPoint || !this.endPoint) return
    
    const gradient = this.createGradient()
    if (gradient) {
      this.gradientShape.fillPriority('linear-gradient')
      this.gradientShape.fill(gradient as any)
      this.previewLayer?.batchDraw()
    }
  }
  
  /**
   * Create gradient configuration based on type
   */
  private createGradient(): any {
    if (!this.startPoint || !this.endPoint) return null
    
    // Process gradient stops
    const stops = this.reverse 
      ? [...this.gradientStops].reverse()
      : this.gradientStops
    
    // Convert stops to Konva format
    const colorStops: (number | string)[] = []
    stops.forEach(stop => {
      colorStops.push(stop.offset)
      const opacity = Math.floor(stop.opacity * 255).toString(16).padStart(2, '0')
      colorStops.push(stop.color + opacity)
    })
    
    switch (this.gradientType) {
      case 'linear':
        return {
          start: { x: this.startPoint.x, y: this.startPoint.y },
          end: { x: this.endPoint.x, y: this.endPoint.y },
          colorStops
        }
        
      case 'radial':
        return {
          start: { x: this.startPoint.x, y: this.startPoint.y },
          end: { x: this.startPoint.x, y: this.startPoint.y },
          startRadius: 0,
          endRadius: this.calculateDistance(this.startPoint, this.endPoint),
          colorStops
        }
        
      case 'angle':
        return this.createAngleGradient(colorStops)
        
      case 'reflected':
        return this.createReflectedGradient(colorStops)
        
      case 'diamond':
        return this.createDiamondGradient(colorStops)
        
      default:
        return null
    }
  }
  
  /**
   * Create angle gradient (conic)
   */
  private createAngleGradient(colorStops: number[]): any {
    if (!this.startPoint || !this.endPoint) return null
    
    // Calculate angle
    const angle = Math.atan2(
      this.endPoint.y - this.startPoint.y,
      this.endPoint.x - this.startPoint.x
    )
    
    // For angle gradient, we need to create a custom fill
    // This is a simplified version - real implementation would use canvas pattern
    return {
      start: { x: this.startPoint.x, y: this.startPoint.y },
      end: { x: this.endPoint.x, y: this.endPoint.y },
      colorStops,
      rotation: angle * 180 / Math.PI
    }
  }
  
  /**
   * Create reflected gradient
   */
  private createReflectedGradient(colorStops: number[]): any {
    if (!this.startPoint || !this.endPoint) return null
    
    // Reflected gradient uses mirrored color stops
    const reflectedStops: number[] = []
    
    // First half
    for (let i = 0; i < colorStops.length; i += 2) {
      reflectedStops.push(colorStops[i] * 0.5)
      reflectedStops.push(colorStops[i + 1])
    }
    
    // Second half (reversed)
    for (let i = colorStops.length - 2; i >= 0; i -= 2) {
      reflectedStops.push(0.5 + (1 - colorStops[i]) * 0.5)
      reflectedStops.push(colorStops[i + 1])
    }
    
    return {
      start: { x: this.startPoint.x, y: this.startPoint.y },
      end: { x: this.endPoint.x, y: this.endPoint.y },
      colorStops: reflectedStops
    }
  }
  
  /**
   * Create diamond gradient
   */
  private createDiamondGradient(colorStops: number[]): any {
    if (!this.startPoint || !this.endPoint) return null
    
    // Diamond gradient is like radial but with square shape
    // This is a simplified version
    const distance = this.calculateDistance(this.startPoint, this.endPoint)
    
    return {
      start: { x: this.startPoint.x, y: this.startPoint.y },
      end: { x: this.startPoint.x, y: this.startPoint.y },
      startRadius: 0,
      endRadius: distance,
      colorStops,
      // Custom property to indicate diamond shape
      shape: 'diamond'
    }
  }
  
  /**
   * Apply gradient to canvas
   */
  private applyGradient(): void {
    if (!this.startPoint || !this.endPoint || !this.gradientShape) return
    
    const canvas = this.getCanvas()
    const activeLayer = canvas.getActiveLayer()
    if (!activeLayer) return
    
    // Clone the gradient shape to the active layer
    const gradient = this.gradientShape.clone()
    gradient.opacity(this.opacity / 100)
    gradient.globalCompositeOperation(this.blendMode)
    
    // Add to active layer
    activeLayer.konvaLayer.add(gradient)
    activeLayer.konvaLayer.batchDraw()
    
    // Emit event for history
    if (this.executionContext) {
      this.executionContext.emit('gradient.applied', {
        toolId: this.id,
        gradientId: `gradient-${Date.now()}`,
        type: this.gradientType,
        startPoint: this.startPoint,
        endPoint: this.endPoint,
        stops: this.gradientStops,
        layerId: activeLayer.id
      })
    }
  }
  
  /**
   * Clear gradient preview
   */
  private clearPreview(): void {
    if (this.gradientShape) {
      this.gradientShape.destroy()
      this.gradientShape = null
    }
    this.previewLayer?.clear()
    this.previewLayer?.batchDraw()
  }
  
  /**
   * Calculate distance between two points
   */
  private calculateDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.sqrt(dx * dx + dy * dy)
  }
  
  /**
   * Add gradient stop
   */
  addGradientStop(offset: number, color: string, opacity: number = 1): void {
    this.gradientStops.push({ offset, color, opacity })
    this.gradientStops.sort((a, b) => a.offset - b.offset)
    this.updatePreview()
  }
  
  /**
   * Remove gradient stop
   */
  removeGradientStop(index: number): void {
    if (this.gradientStops.length > 2) {
      this.gradientStops.splice(index, 1)
      this.updatePreview()
    }
  }
  
  /**
   * Update gradient stop
   */
  updateGradientStop(index: number, stop: Partial<typeof this.gradientStops[0]>): void {
    if (index >= 0 && index < this.gradientStops.length) {
      this.gradientStops[index] = { ...this.gradientStops[index], ...stop }
      this.gradientStops.sort((a, b) => a.offset - b.offset)
      this.updatePreview()
    }
  }
  
  /**
   * Load preset gradient
   */
  loadPresetGradient(preset: typeof this.gradientStops): void {
    this.gradientStops = [...preset]
    this.updatePreview()
  }
} 