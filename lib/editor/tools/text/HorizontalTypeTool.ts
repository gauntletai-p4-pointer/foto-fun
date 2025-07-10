import { Type } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point, CanvasObject } from '@/lib/editor/canvas/types'
import { ObjectAddedEvent, ObjectModifiedEvent } from '@/lib/events/canvas/CanvasEvents'

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
  private activeText: Konva.Text | null = null
  private editingText: Konva.Text | null = null
  private textLayer: Konva.Layer | null = null
  private textarea: HTMLTextAreaElement | null = null
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Create a dedicated layer for text editing
    this.textLayer = new Konva.Layer()
    canvas.konvaStage.add(this.textLayer)
    this.textLayer.moveToTop()
    
    // Set default text options
    this.setOption('fontFamily', 'Arial')
    this.setOption('fontSize', 60)
    this.setOption('color', '#000000')
    this.setOption('alignment', 'left')
    this.setOption('bold', false)
    this.setOption('italic', false)
    this.setOption('underline', false)
    this.setOption('letterSpacing', 0)
    this.setOption('lineHeight', 1.2)
  }
  
  protected cleanupTool(): void {
    // Finish any active editing
    if (this.editingText) {
      this.finishEditing()
    }
    
    // Clean up text layer
    if (this.textLayer) {
      this.textLayer.destroy()
      this.textLayer = null
    }
    
    // Reset state
    this.activeText = null
    this.editingText = null
    this.textarea = null
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
      if (this.editingText) {
        await this.finishEditing()
      }
      
      // Create new text at click position
      await this.createNewText(point)
    }
  }
  
  onKeyDown(event: KeyboardEvent): void {
    // Handle escape to cancel editing
    if (event.key === 'Escape' && this.editingText) {
      this.cancelEditing()
    }
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    // Apply text style changes to active text
    if (this.activeText) {
      switch (key) {
        case 'fontFamily':
          this.activeText.fontFamily(value as string)
          break
        case 'fontSize':
          this.activeText.fontSize(value as number)
          break
        case 'color':
          this.activeText.fill(value as string)
          break
        case 'alignment':
          this.activeText.align(value as string)
          break
        case 'bold':
          this.activeText.fontStyle(this.getFontStyle())
          break
        case 'italic':
          this.activeText.fontStyle(this.getFontStyle())
          break
        case 'underline':
          this.activeText.textDecoration(value ? 'underline' : '')
          break
        case 'letterSpacing':
          this.activeText.letterSpacing(value as number)
          break
        case 'lineHeight':
          this.activeText.lineHeight(value as number)
          break
      }
      
      // Update textarea if editing
      if (this.textarea && this.editingText === this.activeText) {
        this.updateTextareaStyle()
      }
      
      // Redraw
      const layer = this.activeText.getLayer()
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
      await this.executionContext.emit(new ObjectAddedEvent(
        'canvas',
        { ...canvasObject, node: undefined } as CanvasObject,
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
    this.editingText = textNode
    this.activeText = textNode
    
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
    if (!this.textarea || !this.editingText) return
    
    this.textarea.style.fontFamily = this.editingText.fontFamily()
    this.textarea.style.fontSize = `${this.editingText.fontSize()}px`
    this.textarea.style.color = this.editingText.fill() as string
    this.textarea.style.fontWeight = this.getOption('bold') ? 'bold' : 'normal'
    this.textarea.style.fontStyle = this.getOption('italic') ? 'italic' : 'normal'
    this.textarea.style.textDecoration = this.getOption('underline') ? 'underline' : 'none'
    this.textarea.style.letterSpacing = `${this.editingText.letterSpacing()}px`
    this.textarea.style.lineHeight = `${this.editingText.lineHeight()}`
    this.textarea.style.textAlign = this.editingText.align()
  }
  
  /**
   * Handle text input
   */
  private handleTextInput(): void {
    if (!this.textarea || !this.editingText) return
    
    // Update text node with textarea value
    this.editingText.text(this.textarea.value)
    
    // Adjust textarea size
    this.textarea.style.height = 'auto'
    this.textarea.style.height = `${this.textarea.scrollHeight}px`
  }
  
  /**
   * Finish editing and apply changes
   */
  private async finishEditing(): Promise<void> {
    if (!this.editingText || !this.textarea) return
    
    const canvas = this.getCanvas()
    const finalText = this.textarea.value
    
    // Update text node
    this.editingText.text(finalText)
    this.editingText.show()
    
    // Find canvas object
    let canvasObject: CanvasObject | null = null
    for (const layer of canvas.state.layers) {
      const obj = layer.objects.find(o => o.node === this.editingText)
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
        await this.executionContext.emit(new ObjectModifiedEvent(
          'canvas',
          { ...canvasObject, node: undefined } as CanvasObject,
          { ...canvasObject, data: previousData, node: undefined } as CanvasObject,
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
    const layer = this.editingText.getLayer()
    if (layer) layer.batchDraw()
    
    // Clear editing state
    this.editingText = null
  }
  
  /**
   * Cancel editing without saving
   */
  private cancelEditing(): void {
    if (!this.editingText) return
    
    // Show text node without changes
    this.editingText.show()
    
    // Clean up textarea
    if (this.textarea) {
      this.textarea.remove()
      this.textarea = null
    }
    
    // Redraw
    const layer = this.editingText.getLayer()
    if (layer) layer.batchDraw()
    
    // Clear editing state
    this.editingText = null
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
    if (this.editingText) {
      this.editingText.text(text)
      await this.finishEditing()
    }
  }
}

// Export singleton instance
export const horizontalTypeTool = new HorizontalTypeTool() 