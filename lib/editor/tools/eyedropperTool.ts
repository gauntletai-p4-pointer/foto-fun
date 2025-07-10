import { Pipette } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from './base/BaseTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'

/**
 * Eyedropper Tool - Color picker from canvas
 * Konva implementation with pixel-level color sampling
 */
export class EyedropperTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.EYEDROPPER
  name = 'Eyedropper Tool'
  icon = Pipette
  cursor = 'crosshair'
  shortcut = 'I'
  
  // Sampling state
  private isSampling = false
  private previewDiv: HTMLDivElement | null = null
  private magnifierCanvas: HTMLCanvasElement | null = null
  private magnifierCtx: CanvasRenderingContext2D | null = null
  
  // Magnifier settings
  private readonly MAGNIFIER_SIZE = 150
  private readonly MAGNIFIER_ZOOM = 10
  private readonly PIXEL_SIZE = 15 // Size of each magnified pixel
  
  protected setupTool(): void {
    // Set default sampling options
    this.setOption('sampleSize', 'point') // 'point', '3x3', '5x5', '11x11', '31x31'
    this.setOption('sampleAllLayers', true)
    
    // Create magnifier elements
    this.createMagnifier()
  }
  
  protected cleanupTool(): void {
    // Clean up magnifier
    if (this.previewDiv) {
      this.previewDiv.remove()
      this.previewDiv = null
    }
    
    // Reset state
    this.isSampling = false
    this.magnifierCanvas = null
    this.magnifierCtx = null
  }
  
  onMouseDown(event: ToolEvent): void {
    this.isSampling = true
    this.sampleColor(event.point)
  }
  
  onMouseMove(event: ToolEvent): void {
    
    // Update magnifier position and content
    if (this.previewDiv && this.magnifierCanvas && this.magnifierCtx) {
      // Position magnifier near cursor
      this.previewDiv.style.left = `${event.screenPoint.x + 20}px`
      this.previewDiv.style.top = `${event.screenPoint.y - this.MAGNIFIER_SIZE - 20}px`
      this.previewDiv.style.display = 'block'
      
      // Update magnifier content
      this.updateMagnifier(event.point)
    }
    
    // Sample color while dragging
    if (this.isSampling) {
      this.sampleColor(event.point)
    }
  }
  
  onMouseUp(event: ToolEvent): void {
    if (this.isSampling) {
      this.isSampling = false
      
      // Final color sample
      const color = this.sampleColor(event.point)
      
      // Apply color to active color store
      if (color) {
        this.applyColor(color)
      }
    }
  }
  
  onMouseLeave(): void {
    // Hide magnifier when mouse leaves canvas
    if (this.previewDiv) {
      this.previewDiv.style.display = 'none'
    }
  }
  
  onKeyDown(event: KeyboardEvent): void {
    // Alt key toggles between foreground/background color
    if (event.key === 'Alt') {
      this.setOption('targetColor', 'background')
    }
  }
  
  onKeyUp(event: KeyboardEvent): void {
    // Release Alt key switches back to foreground
    if (event.key === 'Alt') {
      this.setOption('targetColor', 'foreground')
    }
  }
  
  /**
   * Create magnifier preview elements
   */
  private createMagnifier(): void {
    // Create container div
    this.previewDiv = document.createElement('div')
    this.previewDiv.style.position = 'fixed'
    this.previewDiv.style.width = `${this.MAGNIFIER_SIZE}px`
    this.previewDiv.style.height = `${this.MAGNIFIER_SIZE + 30}px`
    this.previewDiv.style.backgroundColor = '#fff'
    this.previewDiv.style.border = '1px solid #ccc'
    this.previewDiv.style.borderRadius = '4px'
    this.previewDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
    this.previewDiv.style.pointerEvents = 'none'
    this.previewDiv.style.zIndex = '10000'
    this.previewDiv.style.display = 'none'
    this.previewDiv.style.overflow = 'hidden'
    
    // Create magnifier canvas
    this.magnifierCanvas = document.createElement('canvas')
    this.magnifierCanvas.width = this.MAGNIFIER_SIZE
    this.magnifierCanvas.height = this.MAGNIFIER_SIZE
    this.magnifierCanvas.style.width = `${this.MAGNIFIER_SIZE}px`
    this.magnifierCanvas.style.height = `${this.MAGNIFIER_SIZE}px`
    this.magnifierCanvas.style.imageRendering = 'pixelated'
    
    this.magnifierCtx = this.magnifierCanvas.getContext('2d', { 
      willReadFrequently: true 
    })
    
    // Create color info div
    const colorInfo = document.createElement('div')
    colorInfo.style.padding = '4px 8px'
    colorInfo.style.fontSize = '12px'
    colorInfo.style.fontFamily = 'monospace'
    colorInfo.style.textAlign = 'center'
    colorInfo.style.borderTop = '1px solid #eee'
    colorInfo.className = 'eyedropper-color-info'
    
    // Assemble elements
    this.previewDiv.appendChild(this.magnifierCanvas)
    this.previewDiv.appendChild(colorInfo)
    document.body.appendChild(this.previewDiv)
  }
  
  /**
   * Update magnifier display
   */
  private updateMagnifier(point: Point): void {
    if (!this.magnifierCtx || !this.magnifierCanvas) return
    
    const canvas = this.getCanvas()
    const sampleSize = this.getSampleSize()
    const halfSize = Math.floor(sampleSize / 2)
    
    // Get image data around cursor
    const rect = {
      x: Math.floor(point.x - halfSize - 5),
      y: Math.floor(point.y - halfSize - 5),
      width: sampleSize + 10,
      height: sampleSize + 10
    }
    
    const imageData = canvas.getImageData(rect)
    
    // Clear magnifier
    this.magnifierCtx.clearRect(0, 0, this.MAGNIFIER_SIZE, this.MAGNIFIER_SIZE)
    
    // Draw magnified pixels
    const pixelSize = this.PIXEL_SIZE
    const centerX = this.MAGNIFIER_SIZE / 2
    const centerY = this.MAGNIFIER_SIZE / 2
    
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const idx = (y * imageData.width + x) * 4
        const r = imageData.data[idx]
        const g = imageData.data[idx + 1]
        const b = imageData.data[idx + 2]
        const a = imageData.data[idx + 3]
        
        // Calculate magnified position
        const mx = centerX + (x - imageData.width / 2) * pixelSize
        const my = centerY + (y - imageData.height / 2) * pixelSize
        
        // Draw pixel
        this.magnifierCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`
        this.magnifierCtx.fillRect(mx, my, pixelSize, pixelSize)
        
        // Draw grid
        this.magnifierCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
        this.magnifierCtx.strokeRect(mx, my, pixelSize, pixelSize)
      }
    }
    
    // Draw center crosshair
    this.magnifierCtx.strokeStyle = '#000'
    this.magnifierCtx.lineWidth = 1
    this.magnifierCtx.beginPath()
    this.magnifierCtx.moveTo(centerX - 10, centerY)
    this.magnifierCtx.lineTo(centerX + 10, centerY)
    this.magnifierCtx.moveTo(centerX, centerY - 10)
    this.magnifierCtx.lineTo(centerX, centerY + 10)
    this.magnifierCtx.stroke()
    
    // Highlight center pixel(s)
    const highlightSize = Math.ceil(sampleSize * pixelSize)
    this.magnifierCtx.strokeStyle = '#fff'
    this.magnifierCtx.lineWidth = 2
    this.magnifierCtx.strokeRect(
      centerX - highlightSize / 2,
      centerY - highlightSize / 2,
      highlightSize,
      highlightSize
    )
    
    // Sample color and update info
    const color = this.sampleColor(point, false)
    if (color && this.previewDiv) {
      const colorInfo = this.previewDiv.querySelector('.eyedropper-color-info') as HTMLDivElement
      if (colorInfo) {
        colorInfo.textContent = color.hex.toUpperCase()
        colorInfo.style.backgroundColor = color.hex
        colorInfo.style.color = this.getContrastColor(color.hex)
      }
    }
  }
  
  /**
   * Sample color at point
   */
  private sampleColor(point: Point): { hex: string; rgb: { r: number; g: number; b: number; a: number } } | null {
    const canvas = this.getCanvas()
    const sampleSize = this.getSampleSize()
    
    // Get image data for sampling area
    const rect = {
      x: Math.floor(point.x - Math.floor(sampleSize / 2)),
      y: Math.floor(point.y - Math.floor(sampleSize / 2)),
      width: sampleSize,
      height: sampleSize
    }
    
    const imageData = canvas.getImageData(rect)
    
    if (!imageData || imageData.width === 0 || imageData.height === 0) {
      return null
    }
    
    // Calculate average color
    let r = 0, g = 0, b = 0, a = 0
    let pixelCount = 0
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      // Only count pixels with some opacity
      if (imageData.data[i + 3] > 0) {
        r += imageData.data[i]
        g += imageData.data[i + 1]
        b += imageData.data[i + 2]
        a += imageData.data[i + 3]
        pixelCount++
      }
    }
    
    if (pixelCount === 0) {
      return null
    }
    
    // Calculate average
    r = Math.round(r / pixelCount)
    g = Math.round(g / pixelCount)
    b = Math.round(b / pixelCount)
    a = Math.round(a / pixelCount)
    
    // Convert to hex
    const hex = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`
    
    return {
      hex,
      rgb: { r, g, b, a }
    }
  }
  
  /**
   * Get sample size in pixels
   */
  private getSampleSize(): number {
    const sampleSize = this.getOption('sampleSize') as string
    switch (sampleSize) {
      case '3x3': return 3
      case '5x5': return 5
      case '11x11': return 11
      case '31x31': return 31
      default: return 1 // point sample
    }
  }
  
  /**
   * Apply sampled color
   */
  private applyColor(color: { hex: string; rgb: { r: number; g: number; b: number; a: number } }): void {
    // This would integrate with your color store
    // For now, we'll just emit an event
    if (this.executionContext) {
      // You could create a ColorSampledEvent here
      console.log('Color sampled:', color)
    }
    
    // Update the color store (you'll need to inject this)
    // colorStore.setForegroundColor(color.hex)
  }
  
  /**
   * Get contrasting color for text
   */
  private getContrastColor(hex: string): string {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    
    return luminance > 0.5 ? '#000' : '#fff'
  }
  
  /**
   * Sample color for AI operations
   */
  async sampleColorAt(position: Point): Promise<{ hex: string; rgb: { r: number; g: number; b: number; a: number } } | null> {
    return this.sampleColor(position, false)
  }
}

// Export singleton instance
export const eyedropperTool = new EyedropperTool() 