import { Type } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point, CanvasObject } from '@/lib/editor/canvas/types'
import { KonvaObjectAddedEvent, KonvaObjectModifiedEvent } from '@/lib/events/canvas/CanvasEvents'

/**
 * Horizontal Type Tool - Standard text tool for horizontal text
 * Konva implementation with inline editing support
 */
export class HorizontalTypeTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.TYPE_HORIZONTAL
  name = 'Horizontal Type Tool'
  icon = Type
  cursor = 'text'
  shortcut = 'T'
  
  // Text state
  private isTyping = false
  private currentTextNode: Konva.Text | null = null
  private textGroup: Konva.Group | null = null
  private cursorLine: Konva.Line | null = null
  private cursorAnimation: Konva.Animation | null = null
  private textarea: HTMLTextAreaElement | null = null
  
  protected setupTool(): void {
    // Set default text options
    this.setOption('fontSize', 16)
    this.setOption('fontFamily', 'Arial')
    this.setOption('fontStyle', 'normal') // normal, bold, italic, bold italic
    this.setOption('textAlign', 'left') // left, center, right
    this.setOption('fill', '#000000')
  }
  
  protected cleanupTool(): void {
    // Clean up any active text editing
    if (this.isTyping) {
      this.finishEditing()
    }
    
    // Clean up text group
    if (this.textGroup) {
      this.textGroup.destroy()
      this.textGroup = null
    }
    
    // Stop cursor animation
    if (this.cursorAnimation) {
      this.cursorAnimation.stop()
      this.cursorAnimation = null
    }
    
    // Clean up cursor
    if (this.cursorLine) {
      this.cursorLine.destroy()
      this.cursorLine = null
    }
    
    // Redraw overlay layer
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    const overlayLayer = stage.children[2] as Konva.Layer
    if (overlayLayer) {
      overlayLayer.batchDraw()
    }
    
    // Reset state
    this.isTyping = false
    this.currentTextNode = null
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    const canvas = this.getCanvas()
    const point = event.point
    
    // Check if clicking on existing text
    const clickedObject = canvas.getObjectAtPoint(point)
    
    if (clickedObject && clickedObject.type === 'text') {
      // Start editing existing text
      const textNode = clickedObject.node as Konva.Text
      this.startEditing(textNode, clickedObject)
    } else {
      // Finish any current editing
      if (this.isTyping) {
        await this.finishEditing()
      }
      
      // Create new text at click position
      await this.createNewText(point)
    }
  }
  
  onKeyDown(event: KeyboardEvent): void {
    // Handle escape to cancel editing
    if (event.key === 'Escape' && this.isTyping) {
      this.cancelEditing()
    }
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    // Apply text style changes to active text
    if (this.currentTextNode) {
      switch (key) {
        case 'fontFamily':
          this.currentTextNode.fontFamily(value as string)
          break
        case 'fontSize':
          this.currentTextNode.fontSize(value as number)
          break
        case 'color':
          this.currentTextNode.fill(value as string)
          break
        case 'alignment':
          this.currentTextNode.align(value as string)
          break
        case 'bold':
          this.currentTextNode.fontStyle(this.getFontStyle())
          break
        case 'italic':
          this.currentTextNode.fontStyle(this.getFontStyle())
          break
        case 'underline':
          this.currentTextNode.textDecoration(value ? 'underline' : '')
          break
        case 'letterSpacing':
          this.currentTextNode.letterSpacing(value as number)
          break
        case 'lineHeight':
          this.currentTextNode.lineHeight(value as number)
          break
      }
      
      // Update textarea if editing
      if (this.textarea && this.currentTextNode === this.currentTextNode) {
        this.updateTextareaStyle()
      }
      
      // Redraw
      const layer = this.currentTextNode.getLayer()
      if (layer) layer.batchDraw()
    }
  }
  
  /**
   * Create new text object
   */
  private async createNewText(point: Point): Promise<void> {
    const canvas = this.getCanvas()
    const activeLayer = canvas.getActiveLayer()
    if (!activeLayer) return
    
    // Create text node with current options
    const text = new Konva.Text({
      x: point.x,
      y: point.y,
      text: ' ', // Start with space to show cursor
      fontFamily: this.getOption('fontFamily') as string,
      fontSize: this.getOption('fontSize') as number,
      fill: this.getOption('color') as string,
      align: this.getOption('alignment') as string,
      fontStyle: this.getFontStyle(),
      textDecoration: this.getOption('underline') ? 'underline' : '',
      letterSpacing: this.getOption('letterSpacing') as number,
      lineHeight: this.getOption('lineHeight') as number,
      draggable: true,
      width: 300, // Initial width for text wrapping
      padding: 5
    })
    
    // Add to layer
    activeLayer.konvaLayer.add(text)
    
    // Create canvas object
    const canvasObject: CanvasObject = {
      id: `text-${Date.now()}`,
      type: 'text',
      name: 'Text',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      transform: {
        x: point.x,
        y: point.y,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        skewX: 0,
        skewY: 0
      },
      node: text,
      layerId: activeLayer.id,
      data: text.text()
    }
    
    // Add to layer objects
    activeLayer.objects.push(canvasObject)
    
    // Emit event
    if (this.executionContext) {
      await this.executionContext.emit(new KonvaObjectAddedEvent(
        'canvas',
        canvasObject.id,
        canvasObject.type,
        {
          name: canvasObject.name,
          visible: canvasObject.visible,
          locked: canvasObject.locked,
          opacity: canvasObject.opacity,
          blendMode: canvasObject.blendMode,
          transform: canvasObject.transform,
          data: canvasObject.data
        },
        activeLayer.id,
        this.executionContext.getMetadata()
      ))
    }
    
    // Start editing immediately
    this.startEditing(text, canvasObject)
  }
  
  /**
   * Start editing text
   */
  private startEditing(textNode: Konva.Text, _canvasObject: CanvasObject): void {
    this.currentTextNode = textNode
    this.isTyping = true
    
    // Hide the text node while editing
    textNode.hide()
    
    // Create textarea for editing
    this.createTextarea(textNode)
    
    // Focus textarea
    if (this.textarea) {
      this.textarea.focus()
      // Select all text if it's just a space
      if (this.textarea.value.trim() === '') {
        this.textarea.select()
      }
    }
    
    // Redraw layer
    const layer = textNode.getLayer()
    if (layer) layer.batchDraw()
  }
  
  /**
   * Create textarea for text editing
   */
  private createTextarea(textNode: Konva.Text): void {
    // Remove existing textarea if any
    if (this.textarea) {
      this.textarea.remove()
    }
    
    // Create new textarea
    this.textarea = document.createElement('textarea')
    document.body.appendChild(this.textarea)
    
    // Get absolute position of text
    const textPosition = textNode.absolutePosition()
    const stage = textNode.getStage()
    if (!stage) return
    
    const stageBox = stage.container().getBoundingClientRect()
    const areaPosition = {
      x: stageBox.left + textPosition.x,
      y: stageBox.top + textPosition.y
    }
    
    // Set textarea properties
    this.textarea.value = textNode.text()
    this.textarea.style.position = 'absolute'
    this.textarea.style.top = `${areaPosition.y}px`
    this.textarea.style.left = `${areaPosition.x}px`
    this.textarea.style.width = `${textNode.width()}px`
    this.textarea.style.height = `${textNode.height() + 20}px`
    this.textarea.style.padding = `${textNode.padding()}px`
    this.textarea.style.margin = '0'
    this.textarea.style.overflow = 'hidden'
    this.textarea.style.background = 'rgba(255, 255, 255, 0.9)'
    this.textarea.style.border = '1px solid #ccc'
    this.textarea.style.borderRadius = '2px'
    this.textarea.style.outline = 'none'
    this.textarea.style.resize = 'none'
    this.textarea.style.transformOrigin = 'left top'
    
    // Apply text styles
    this.updateTextareaStyle()
    
    // Handle input
    this.textarea.addEventListener('input', () => {
      this.handleTextInput()
    })
    
    // Handle blur (finish editing)
    this.textarea.addEventListener('blur', () => {
      this.finishEditing()
    })
    
    // Handle special keys
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancelEditing()
      } else if (e.key === 'Enter' && e.ctrlKey) {
        this.finishEditing()
      }
    })
  }
  
  /**
   * Update textarea style to match text node
   */
  private updateTextareaStyle(): void {
    if (!this.textarea || !this.currentTextNode) return
    
    this.textarea.style.fontFamily = this.currentTextNode.fontFamily()
    this.textarea.style.fontSize = `${this.currentTextNode.fontSize()}px`
    this.textarea.style.color = this.currentTextNode.fill() as string
    this.textarea.style.fontWeight = this.getOption('bold') ? 'bold' : 'normal'
    this.textarea.style.fontStyle = this.getOption('italic') ? 'italic' : 'normal'
    this.textarea.style.textDecoration = this.getOption('underline') ? 'underline' : 'none'
    this.textarea.style.letterSpacing = `${this.currentTextNode.letterSpacing()}px`
    this.textarea.style.lineHeight = `${this.currentTextNode.lineHeight()}`
    this.textarea.style.textAlign = this.currentTextNode.align()
  }
  
  /**
   * Handle text input
   */
  private handleTextInput(): void {
    if (!this.textarea || !this.currentTextNode) return
    
    // Update text node with textarea value
    this.currentTextNode.text(this.textarea.value)
    
    // Adjust textarea size
    this.textarea.style.height = 'auto'
    this.textarea.style.height = `${this.textarea.scrollHeight}px`
  }
  
  /**
   * Finish editing and apply changes
   */
  private async finishEditing(): Promise<void> {
    if (!this.currentTextNode || !this.textarea) return
    
    const canvas = this.getCanvas()
    const finalText = this.textarea.value
    
    // Update text node
    this.currentTextNode.text(finalText)
    this.currentTextNode.show()
    
    // Find canvas object
    let canvasObject: CanvasObject | null = null
    for (const layer of canvas.state.layers) {
      const obj = layer.objects.find(o => o.node === this.currentTextNode)
      if (obj) {
        canvasObject = obj
        break
      }
    }
    
    // Emit event if text changed
    if (canvasObject && canvasObject.data !== finalText) {
      const previousData = canvasObject.data
      canvasObject.data = finalText
      
      if (this.executionContext) {
        await this.executionContext.emit(new KonvaObjectModifiedEvent(
          'canvas',
          canvasObject.id,
          { data: previousData },
          { data: finalText },
          this.executionContext.getMetadata()
        ))
      }
    }
    
    // Clean up textarea
    if (this.textarea) {
      this.textarea.remove()
      this.textarea = null
    }
    
    // Redraw
    const layer = this.currentTextNode.getLayer()
    if (layer) layer.batchDraw()
    
    // Clear editing state
    this.currentTextNode = null
    this.isTyping = false
  }
  
  /**
   * Cancel editing without saving
   */
  private cancelEditing(): void {
    if (!this.currentTextNode) return
    
    // Show text node without changes
    this.currentTextNode.show()
    
    // Clean up textarea
    if (this.textarea) {
      this.textarea.remove()
      this.textarea = null
    }
    
    // Redraw
    const layer = this.currentTextNode.getLayer()
    if (layer) layer.batchDraw()
    
    // Clear editing state
    this.currentTextNode = null
    this.isTyping = false
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
   * Apply text for AI operations
   */
  async applyWithContext(
    text: string,
    position: Point,
    options?: {
      fontFamily?: string
      fontSize?: number
      color?: string
      alignment?: string
      bold?: boolean
      italic?: boolean
      underline?: boolean
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
    
    // Create text at position
    await this.createNewText(position)
    
    // Set the text content
    if (this.currentTextNode) {
      this.currentTextNode.text(text)
      await this.finishEditing()
    }
  }
}

// Export singleton instance
export const horizontalTypeTool = new HorizontalTypeTool() 