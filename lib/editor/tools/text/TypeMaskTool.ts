import { Type } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point, Selection } from '@/lib/editor/canvas/types'
import { SelectionCreatedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Type Mask Tool - Creates text-based selection masks
 * Konva implementation that converts text to selection
 */
export class TypeMaskTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.TYPE_MASK
  name = 'Type Mask Tool'
  icon = Type
  cursor = 'text'
  shortcut = undefined // Access via tool palette
  
  // Mask state
  private maskText: Konva.Text | null = null
  private maskLayer: Konva.Layer | null = null
  private textarea: HTMLTextAreaElement | null = null
  private isCreating = false
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Create a dedicated layer for mask creation
    this.maskLayer = new Konva.Layer()
    canvas.konvaStage.add(this.maskLayer)
    this.maskLayer.moveToTop()
    
    // Set default text options
    this.setOption('fontFamily', 'Arial')
    this.setOption('fontSize', 100)
    this.setOption('bold', true)
    this.setOption('italic', false)
  }
  
  protected cleanupTool(): void {
    // Finish any active mask creation
    if (this.isCreating) {
      this.cancelMaskCreation()
    }
    
    // Clean up mask layer
    if (this.maskLayer) {
      this.maskLayer.destroy()
      this.maskLayer = null
    }
    
    // Reset state
    this.maskText = null
    this.textarea = null
    this.isCreating = false
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    if (this.isCreating) return
    
    const point = event.point
    
    // Start creating text mask
    await this.startMaskCreation(point)
  }
  
  onKeyDown(event: KeyboardEvent): void {
    // Handle escape to cancel
    if (event.key === 'Escape' && this.isCreating) {
      this.cancelMaskCreation()
    }
  }
  
  /**
   * Start creating a text mask
   */
  private async startMaskCreation(point: Point): Promise<void> {
    if (!this.maskLayer) return
    
    this.isCreating = true
    
    // Create text node for mask
    this.maskText = new Konva.Text({
      x: point.x,
      y: point.y,
      text: ' ', // Start with space
      fontFamily: this.getOption('fontFamily') as string,
      fontSize: this.getOption('fontSize') as number,
      fontStyle: this.getFontStyle(),
      fill: 'rgba(255, 0, 0, 0.5)', // Red semi-transparent for visibility
      draggable: true
    })
    
    // Add to mask layer
    this.maskLayer.add(this.maskText)
    this.maskLayer.batchDraw()
    
    // Create textarea for editing
    this.createTextarea()
    
    // Focus textarea
    if (this.textarea) {
      this.textarea.focus()
      this.textarea.select()
    }
  }
  
  /**
   * Create textarea for text editing
   */
  private createTextarea(): void {
    if (!this.maskText) return
    
    // Remove existing textarea if any
    if (this.textarea) {
      this.textarea.remove()
    }
    
    // Create new textarea
    this.textarea = document.createElement('textarea')
    document.body.appendChild(this.textarea)
    
    // Get absolute position of text
    const textPosition = this.maskText.absolutePosition()
    const stage = this.maskText.getStage()
    if (!stage) return
    
    const stageBox = stage.container().getBoundingClientRect()
    const areaPosition = {
      x: stageBox.left + textPosition.x,
      y: stageBox.top + textPosition.y
    }
    
    // Set textarea properties
    this.textarea.value = ''
    this.textarea.style.position = 'absolute'
    this.textarea.style.top = `${areaPosition.y}px`
    this.textarea.style.left = `${areaPosition.x}px`
    this.textarea.style.width = '400px'
    this.textarea.style.height = '150px'
    this.textarea.style.padding = '5px'
    this.textarea.style.margin = '0'
    this.textarea.style.overflow = 'auto'
    this.textarea.style.background = 'rgba(255, 255, 255, 0.9)'
    this.textarea.style.border = '2px solid #ff0000'
    this.textarea.style.borderRadius = '2px'
    this.textarea.style.outline = 'none'
    this.textarea.style.resize = 'both'
    
    // Apply text styles
    this.textarea.style.fontFamily = this.maskText.fontFamily()
    this.textarea.style.fontSize = '16px' // Smaller for editing
    this.textarea.style.fontWeight = this.getOption('bold') ? 'bold' : 'normal'
    this.textarea.style.fontStyle = this.getOption('italic') ? 'italic' : 'normal'
    
    // Handle input
    this.textarea.addEventListener('input', () => {
      this.updateMaskText()
    })
    
    // Handle blur (finish mask)
    this.textarea.addEventListener('blur', () => {
      this.finishMaskCreation()
    })
    
    // Handle special keys
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancelMaskCreation()
      } else if (e.key === 'Enter' && e.ctrlKey) {
        this.finishMaskCreation()
      }
    })
  }
  
  /**
   * Update mask text preview
   */
  private updateMaskText(): void {
    if (!this.textarea || !this.maskText) return
    
    // Update text
    this.maskText.text(this.textarea.value || ' ')
    
    // Redraw
    if (this.maskLayer) {
      this.maskLayer.batchDraw()
    }
  }
  
  /**
   * Finish mask creation and convert to selection
   */
  private async finishMaskCreation(): Promise<void> {
    if (!this.maskText || !this.textarea || !this.maskLayer) return
    
    const canvas = this.getCanvas()
    const text = this.textarea.value
    
    if (text.trim()) {
      // Convert text to path for selection
      const bounds = this.maskText.getClientRect()
      
      // Create offscreen canvas to render text
      const offscreenCanvas = document.createElement('canvas')
      offscreenCanvas.width = Math.ceil(bounds.width + 20)
      offscreenCanvas.height = Math.ceil(bounds.height + 20)
      const ctx = offscreenCanvas.getContext('2d')
      
      if (ctx) {
        // Clear canvas
        ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)
        
        // Set text properties
        ctx.font = `${this.getFontStyle()} ${this.maskText.fontSize()}px ${this.maskText.fontFamily()}`
        ctx.fillStyle = '#000000'
        ctx.textBaseline = 'top'
        
        // Draw text
        const lines = text.split('\n')
        let y = 10
        lines.forEach(line => {
          ctx.fillText(line, 10, y)
          y += this.maskText?.fontSize() * 1.2 || 24
        })
        
        // Get image data for mask
        const imageData = ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height)
        
        // Create pixel mask from text alpha channel
        const maskData = new ImageData(imageData.width, imageData.height)
        for (let i = 0; i < imageData.data.length; i += 4) {
          // Use alpha channel as mask
          const alpha = imageData.data[i + 3]
          maskData.data[i] = alpha
          maskData.data[i + 1] = alpha
          maskData.data[i + 2] = alpha
          maskData.data[i + 3] = 255
        }
        
        // Create selection from mask
        const selection: Selection = {
          type: 'pixel',
          bounds: {
            x: bounds.x - 10,
            y: bounds.y - 10,
            width: offscreenCanvas.width,
            height: offscreenCanvas.height
          },
          mask: maskData
        }
        
        // Set selection
        canvas.setSelection(selection)
        
        // Emit event
        if (this.executionContext) {
          await this.executionContext.emit(new SelectionCreatedEvent(
            'canvas',
            selection,
            this.executionContext.getMetadata()
          ))
        }
      }
    }
    
    // Clean up
    this.cleanupMaskCreation()
  }
  
  /**
   * Cancel mask creation
   */
  private cancelMaskCreation(): void {
    this.cleanupMaskCreation()
  }
  
  /**
   * Clean up mask creation resources
   */
  private cleanupMaskCreation(): void {
    // Remove text
    if (this.maskText) {
      this.maskText.destroy()
      this.maskText = null
    }
    
    // Remove textarea
    if (this.textarea) {
      this.textarea.remove()
      this.textarea = null
    }
    
    // Clear mask layer
    if (this.maskLayer) {
      this.maskLayer.clear()
      this.maskLayer.batchDraw()
    }
    
    this.isCreating = false
  }
  
  /**
   * Get combined font style
   */
  private getFontStyle(): string {
    const bold = this.getOption('bold')
    const italic = this.getOption('italic')
    
    if (bold && italic) return 'bold italic'
    if (bold) return 'bold'
    if (italic) return 'italic'
    return 'normal'
  }
  
  /**
   * Apply text mask for AI operations
   */
  async applyWithContext(
    text: string,
    position: Point,
    options?: {
      fontFamily?: string
      fontSize?: number
      bold?: boolean
      italic?: boolean
    }
  ): Promise<void> {
    // Set options if provided
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          this.setOption(key, value)
        }
      })
    }
    
    // Start mask creation
    await this.startMaskCreation(position)
    
    // Set the text
    if (this.textarea) {
      this.textarea.value = text
      this.updateMaskText()
      await this.finishMaskCreation()
    }
  }
}

// Export singleton instance
export const typeMaskTool = new TypeMaskTool() 