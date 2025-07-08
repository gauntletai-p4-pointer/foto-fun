import { Pipette } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, TPointerEventInfo } from 'fabric'
import { BaseTool } from './base/BaseTool'
import { useColorStore } from '@/store/colorStore'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import { createToolState } from './utils/toolState'

// Eyedropper tool state
type EyedropperToolState = {
  sampleAllLayers: boolean
  isHovering: boolean
}

/**
 * Eyedropper Tool - Samples color from the canvas
 * 
 * Features:
 * - Click to sample color from any pixel
 * - Shows color preview while hovering
 * - Updates foreground color in tool options
 * - Adds sampled color to recent colors
 * - Option to sample all layers or current layer only
 */
class EyedropperTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.EYEDROPPER
  name = 'Eyedropper Tool'
  icon = Pipette
  cursor = 'crosshair'
  shortcut = 'I'
  
  // Encapsulated state
  private state = createToolState<EyedropperToolState>({
    sampleAllLayers: true,
    isHovering: false
  })
  
  private previewElement: HTMLDivElement | null = null
  
  /**
   * Tool setup
   */
  protected setupTool(canvas: Canvas): void {
    // Create preview element
    this.createPreviewElement()
    
    // Disable object selection
    canvas.selection = false
    
    // Set up event handlers
    this.addCanvasEvent('mouse:down', (e: unknown) => {
      this.handleMouseDown(e as TPointerEventInfo<MouseEvent>)
    })
    
    this.addCanvasEvent('mouse:move', (e: unknown) => {
      this.handleMouseMove(e as TPointerEventInfo<MouseEvent>)
    })
    
    this.addCanvasEvent('mouse:over', () => {
      this.handleMouseOver()
    })
    
    this.addCanvasEvent('mouse:out', () => {
      this.handleMouseOut()
    })
    
    canvas.renderAll()
  }
  
  /**
   * Tool cleanup
   */
  protected cleanup(canvas: Canvas): void {
    // Remove preview element
    this.removePreviewElement()
    
    // Reset cursor
    canvas.defaultCursor = 'default'
    
    // Reset state
    this.state.reset()
    
    canvas.renderAll()
  }
  
  /**
   * Handle mouse down - sample color
   */
  private handleMouseDown(e: TPointerEventInfo<MouseEvent>): void {
    if (!this.canvas || !e.e) return
    
    const color = this.sampleColor(e.e)
    if (color) {
      // Update brush tool color option
      const toolOptionsStore = useToolOptionsStore.getState()
      toolOptionsStore.updateOption(TOOL_IDS.BRUSH, 'color', color)
      
      // Add to recent colors
      const colorStore = useColorStore.getState()
      colorStore.addRecentColor(color)
      
      // Show feedback
      this.showColorFeedback(color, e.e)
    }
  }
  
  /**
   * Handle mouse move - update preview
   */
  private handleMouseMove(e: TPointerEventInfo<MouseEvent>): void {
    if (!this.canvas || !this.state.get('isHovering') || !e.e) return
    
    const color = this.sampleColor(e.e)
    if (color && this.previewElement) {
      this.updatePreview(color, e.e)
    }
  }
  
  /**
   * Handle mouse over canvas
   */
  private handleMouseOver(): void {
    this.state.set('isHovering', true)
    if (this.previewElement) {
      this.previewElement.style.display = 'block'
    }
  }
  
  /**
   * Handle mouse out of canvas
   */
  private handleMouseOut(): void {
    this.state.set('isHovering', false)
    if (this.previewElement) {
      this.previewElement.style.display = 'none'
    }
  }
  
  /**
   * Sample color from canvas at mouse position
   */
  private sampleColor(e: MouseEvent): string | null {
    if (!this.canvas) return null
    
    const canvasElement = this.canvas.getElement()
    const rect = canvasElement.getBoundingClientRect()
    
    // Get mouse position relative to canvas
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Account for canvas scaling
    const scaleX = canvasElement.width / rect.width
    const scaleY = canvasElement.height / rect.height
    
    const canvasX = Math.floor(x * scaleX)
    const canvasY = Math.floor(y * scaleY)
    
    // Get pixel data
    const ctx = canvasElement.getContext('2d')
    if (!ctx) return null
    
    try {
      const imageData = ctx.getImageData(canvasX, canvasY, 1, 1)
      const pixel = imageData.data
      
      // Convert to hex color
      const r = pixel[0]
      const g = pixel[1]
      const b = pixel[2]
      const a = pixel[3] / 255
      
      // If pixel is transparent, sample background
      if (a === 0) {
        return this.canvasStore.backgroundColor
      }
      
      // Convert to hex
      const toHex = (n: number) => n.toString(16).padStart(2, '0')
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    } catch (error) {
      console.error('Error sampling color:', error)
      return null
    }
  }
  
  /**
   * Create preview element
   */
  private createPreviewElement(): void {
    if (this.previewElement) return
    
    this.previewElement = document.createElement('div')
    this.previewElement.style.cssText = `
      position: fixed;
      width: 40px;
      height: 40px;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 1px black, 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: none;
      z-index: 10000;
      display: none;
      transition: background-color 0.1s ease;
    `
    
    document.body.appendChild(this.previewElement)
  }
  
  /**
   * Remove preview element
   */
  private removePreviewElement(): void {
    if (this.previewElement) {
      this.previewElement.remove()
      this.previewElement = null
    }
  }
  
  /**
   * Update preview position and color
   */
  private updatePreview(color: string, e: MouseEvent): void {
    if (!this.previewElement) return
    
    this.previewElement.style.backgroundColor = color
    this.previewElement.style.left = `${e.clientX + 20}px`
    this.previewElement.style.top = `${e.clientY - 20}px`
  }
  
  /**
   * Show color feedback on click
   */
  private showColorFeedback(color: string, e: MouseEvent): void {
    const feedback = document.createElement('div')
    feedback.style.cssText = `
      position: fixed;
      left: ${e.clientX}px;
      top: ${e.clientY - 40}px;
      background: ${color};
      color: ${this.getContrastColor(color)};
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      z-index: 10001;
      animation: fadeOut 1s ease-out forwards;
      pointer-events: none;
    `
    feedback.textContent = color.toUpperCase()
    
    // Add fade out animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes fadeOut {
        0% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
      }
    `
    document.head.appendChild(style)
    
    document.body.appendChild(feedback)
    
    // Remove after animation
    setTimeout(() => {
      feedback.remove()
      style.remove()
    }, 1000)
  }
  
  /**
   * Get contrasting color for text
   */
  private getContrastColor(hexColor: string): string {
    // Convert hex to RGB
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    
    return luminance > 0.5 ? '#000000' : '#FFFFFF'
  }
  
}

// Export singleton instance
export const eyedropperTool = new EyedropperTool() 