import { Palette } from 'lucide-react'
import { ObjectTool } from '../base/ObjectTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { TOOL_IDS } from '@/constants'

/**
 * Object-based Gradient Tool
 * Applies gradients to selected objects
 */
export class GradientTool extends ObjectTool {
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
  private previewCanvas: HTMLCanvasElement | null = null
  
  protected setupTool(): void {
    // Load settings from options
    this.gradientType = (this.getOption('gradientType') as typeof this.gradientType) || 'linear'
    this.opacity = (this.getOption('opacity') as number) || 100
    this.blendMode = (this.getOption('blendMode') as GlobalCompositeOperation) || 'source-over'
    this.reverse = (this.getOption('reverse') as boolean) || false
    this.dither = (this.getOption('dither') as boolean) || true
    
    // Load gradient stops if provided
    const stops = this.getOption('gradientStops')
    if (stops && Array.isArray(stops)) {
      this.gradientStops = stops
    }
  }
  
  protected cleanupTool(): void {
    this.clearPreview()
    this.startPoint = null
    this.endPoint = null
  }
  
  onMouseDown(event: ToolEvent): void {
    this.lastMousePosition = event.point
    
    // Check if we have target objects
    const targets = this.getTargetObjects()
    if (targets.length === 0) return
    
    this.isDrawing = true
    this.startPoint = event.point
    this.endPoint = event.point
    
    // Create preview
    this.createPreview()
  }
  
  onMouseMove(event: ToolEvent): void {
    this.lastMousePosition = event.point
    
    if (!this.isDrawing || !this.startPoint) return
    
    this.endPoint = event.point
    this.updatePreview()
  }
  
  onMouseUp(_event: ToolEvent): void {
    if (!this.isDrawing || !this.startPoint || !this.endPoint) return
    
    this.isDrawing = false
    
    // Apply gradient to target objects
    this.applyGradient()
    
    // Clear preview
    this.clearPreview()
    
    // Reset points
    this.startPoint = null
    this.endPoint = null
  }
  
  /**
   * Create gradient preview
   */
  private createPreview(): void {
    // For now, we'll apply directly without preview
    // In a full implementation, we'd create an overlay
  }
  
  /**
   * Update gradient preview
   */
  private updatePreview(): void {
    // Update preview if implemented
  }
  
  /**
   * Clear gradient preview
   */
  private clearPreview(): void {
    if (this.previewCanvas) {
      this.previewCanvas = null
    }
  }
  
  /**
   * Apply gradient to target objects
   */
  private applyGradient(): void {
    if (!this.startPoint || !this.endPoint) return
    
    const targets = this.getTargetObjects()
    
    for (const target of targets) {
      this.applyGradientToObject(target)
    }
    
    // Trigger canvas update
    this.getCanvas().render()
  }
  
  /**
   * Apply gradient to a specific object
   */
  private applyGradientToObject(object: CanvasObject): void {
    if (!this.startPoint || !this.endPoint) return
    
    // Get object's canvas element
    let canvas: HTMLCanvasElement | null = null
    
    if (object.type === 'image') {
      const imageData = object.data as { element: HTMLCanvasElement | HTMLImageElement }
      if (imageData.element instanceof HTMLCanvasElement) {
        canvas = imageData.element
      } else {
        // Convert image to canvas
        canvas = document.createElement('canvas')
        canvas.width = object.width
        canvas.height = object.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(imageData.element, 0, 0)
        // Update object data
        imageData.element = canvas
      }
    } else if (object.type === 'shape' || object.type === 'text') {
      // Create canvas for shape/text if needed
      canvas = document.createElement('canvas')
      canvas.width = object.width
      canvas.height = object.height
      
      // Draw existing content if any
      // This would depend on the specific shape/text implementation
    }
    
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')!
    
    // Save current state
    ctx.save()
    
    // Convert gradient points from canvas space to object space
    const localStart = {
      x: this.startPoint.x - object.x,
      y: this.startPoint.y - object.y
    }
    const localEnd = {
      x: this.endPoint.x - object.x,
      y: this.endPoint.y - object.y
    }
    
    // Create gradient
    const gradient = this.createCanvasGradient(ctx, localStart, localEnd)
    if (!gradient) {
      ctx.restore()
      return
    }
    
    // Set composite operation
    ctx.globalCompositeOperation = this.blendMode
    ctx.globalAlpha = this.opacity / 100
    
    // Fill with gradient
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Restore state
    ctx.restore()
  }
  
  /**
   * Create canvas gradient
   */
  private createCanvasGradient(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point
  ): CanvasGradient | null {
    let gradient: CanvasGradient | null = null
    
    // Process gradient stops
    const stops = this.reverse 
      ? [...this.gradientStops].reverse()
      : this.gradientStops
    
    switch (this.gradientType) {
      case 'linear':
        gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y)
        break
        
      case 'radial':
        const radius = Math.sqrt(
          Math.pow(end.x - start.x, 2) + 
          Math.pow(end.y - start.y, 2)
        )
        gradient = ctx.createRadialGradient(
          start.x, start.y, 0,
          start.x, start.y, radius
        )
        break
        
      case 'angle':
        // For angle gradient, we'll use linear as approximation
        gradient = this.createAngleGradient(ctx, start, end)
        break
        
      case 'reflected':
        gradient = this.createReflectedGradient(ctx, start, end)
        break
        
      case 'diamond':
        // For diamond, we'll use radial as approximation
        gradient = this.createDiamondGradient(ctx, start, end)
        break
    }
    
    if (!gradient) return null
    
    // Add color stops
    for (const stop of stops) {
      const color = this.addOpacityToColor(stop.color, stop.opacity)
      gradient.addColorStop(stop.offset, color)
    }
    
    return gradient
  }
  
  /**
   * Create angle gradient (using linear approximation)
   */
  private createAngleGradient(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point
  ): CanvasGradient {
    // Calculate angle
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    
    // Create linear gradient perpendicular to angle
    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + 
      Math.pow(end.y - start.y, 2)
    )
    
    const perpX = Math.cos(angle + Math.PI / 2) * distance
    const perpY = Math.sin(angle + Math.PI / 2) * distance
    
    return ctx.createLinearGradient(
      start.x - perpX, start.y - perpY,
      start.x + perpX, start.y + perpY
    )
  }
  
  /**
   * Create reflected gradient
   */
  private createReflectedGradient(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point
  ): CanvasGradient {
    // Create linear gradient that goes from start to end and back
    const _midX = (start.x + end.x) / 2
    const _midY = (start.y + end.y) / 2
    
    // Extend the gradient to create reflection
    const dx = end.x - start.x
    const dy = end.y - start.y
    
    return ctx.createLinearGradient(
      start.x - dx, start.y - dy,
      end.x, end.y
    )
  }
  
  /**
   * Create diamond gradient (using radial approximation)
   */
  private createDiamondGradient(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point
  ): CanvasGradient {
    // Use radial gradient as approximation
    const radius = Math.max(
      Math.abs(end.x - start.x),
      Math.abs(end.y - start.y)
    )
    
    return ctx.createRadialGradient(
      start.x, start.y, 0,
      start.x, start.y, radius
    )
  }
  
  /**
   * Add opacity to hex color
   */
  private addOpacityToColor(color: string, opacity: number): string {
    // Convert hex to rgba
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  
  /**
   * Handle option changes
   */
  protected onOptionChange(key: string, value: unknown): void {
    switch (key) {
      case 'gradientType':
        this.gradientType = value as typeof this.gradientType
        break
      case 'opacity':
        this.opacity = value as number
        break
      case 'blendMode':
        this.blendMode = value as GlobalCompositeOperation
        break
      case 'reverse':
        this.reverse = value as boolean
        break
      case 'dither':
        this.dither = value as boolean
        break
      case 'gradientStops':
        if (Array.isArray(value)) {
          this.gradientStops = value
        }
        break
    }
  }
  
  // Tool options configuration
  static options = [
    {
      id: 'gradientType',
      type: 'select' as const,
      label: 'Type',
      options: [
        { value: 'linear', label: 'Linear' },
        { value: 'radial', label: 'Radial' },
        { value: 'angle', label: 'Angle' },
        { value: 'reflected', label: 'Reflected' },
        { value: 'diamond', label: 'Diamond' }
      ],
      default: 'linear'
    },
    {
      id: 'opacity',
      type: 'slider' as const,
      label: 'Opacity',
      min: 0,
      max: 100,
      default: 100,
      step: 1
    },
    {
      id: 'blendMode',
      type: 'select' as const,
      label: 'Mode',
      options: [
        { value: 'source-over', label: 'Normal' },
        { value: 'multiply', label: 'Multiply' },
        { value: 'screen', label: 'Screen' },
        { value: 'overlay', label: 'Overlay' },
        { value: 'darken', label: 'Darken' },
        { value: 'lighten', label: 'Lighten' },
        { value: 'color-dodge', label: 'Color Dodge' },
        { value: 'color-burn', label: 'Color Burn' },
        { value: 'hard-light', label: 'Hard Light' },
        { value: 'soft-light', label: 'Soft Light' }
      ],
      default: 'source-over'
    },
    {
      id: 'reverse',
      type: 'checkbox' as const,
      label: 'Reverse',
      default: false
    },
    {
      id: 'dither',
      type: 'checkbox' as const,
      label: 'Dither',
      default: true
    }
  ]
  
  /**
   * Add gradient stop
   */
  addGradientStop(offset: number, color: string, opacity: number = 1): void {
    this.gradientStops.push({ offset, color, opacity })
    this.gradientStops.sort((a, b) => a.offset - b.offset)
  }
  
  /**
   * Remove gradient stop
   */
  removeGradientStop(index: number): void {
    if (this.gradientStops.length > 2) {
      this.gradientStops.splice(index, 1)
    }
  }
  
  /**
   * Update gradient stop
   */
  updateGradientStop(index: number, stop: Partial<typeof this.gradientStops[0]>): void {
    if (index >= 0 && index < this.gradientStops.length) {
      this.gradientStops[index] = { ...this.gradientStops[index], ...stop }
      this.gradientStops.sort((a, b) => a.offset - b.offset)
    }
  }
  
  /**
   * Load preset gradient
   */
  loadPresetGradient(preset: typeof this.gradientStops): void {
    this.gradientStops = [...preset]
  }
}

// Export singleton instance
export const gradientTool = new GradientTool() 