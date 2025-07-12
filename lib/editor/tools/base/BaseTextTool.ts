import { BaseTool, type ToolDependencies, type ToolOptions, type ToolOptionDefinition } from './BaseTool'
import Konva from 'konva'
import { createToolState } from '../utils/toolState'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { ObjectAddedEvent, ObjectModifiedEvent } from '@/lib/events/canvas/CanvasEvents'

interface BaseTextToolOptions extends ToolOptions {
  fontFamily: ToolOptionDefinition<string>
  fontSize: ToolOptionDefinition<number>
  color: ToolOptionDefinition<string>
  alignment: ToolOptionDefinition<'left' | 'center' | 'right'>
  bold: ToolOptionDefinition<boolean>
  italic: ToolOptionDefinition<boolean>
  underline: ToolOptionDefinition<boolean>
  letterSpacing: ToolOptionDefinition<number>
  lineHeight: ToolOptionDefinition<number>
}

// Extend TextToolState to satisfy Record constraint
interface ExtendedTextToolState extends Record<string, unknown> {
  currentText: Konva.Text | null
  isEditing: boolean
  originalText: string
  lastClickTime: number
  lastClickPosition: { x: number; y: number }
  isCommitting: boolean // Add guard flag to prevent re-entry
}

/**
 * Base class for text tools (horizontal, vertical, mask, path)
 * Provides common text editing functionality and state management
 * Konva implementation with inline editing support
 */
export abstract class BaseTextTool extends BaseTool<BaseTextToolOptions> {
  constructor(dependencies: ToolDependencies) {
    super(dependencies)
  }
  // Encapsulated state using ToolStateManager
  protected state = createToolState<ExtendedTextToolState>({
    currentText: null,
    isEditing: false,
    originalText: '',
    lastClickTime: 0,
    lastClickPosition: { x: 0, y: 0 },
    isCommitting: false
  })
  
  // Double-click threshold in milliseconds
  protected readonly DOUBLE_CLICK_THRESHOLD = 300
  
  // Text editing state
  protected textarea: HTMLTextAreaElement | null = null
  
  /**
   * Tool-specific setup
   */
  protected setupTool(): void {
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
  
  /**
   * Tool-specific cleanup
   */
  protected cleanupTool(): void {
    // Commit any active text
    if (this.state.get('isEditing') && !this.state.get('isCommitting')) {
      this.commitText()
    }
    
    // Clean up textarea
    this.cleanupTextarea()
    
    // Reset state
    this.state.reset()
  }
  
  /**
   * Handle mouse down - create or edit text
   */
  async onMouseDown(event: ToolEvent): Promise<void> {
    const canvas = this.getCanvas()
    const point = event.point
    const currentTime = Date.now()
    const lastClickTime = this.state.get('lastClickTime')
    const lastPosition = this.state.get('lastClickPosition')
    
    // Check for double-click
    const isDoubleClick = 
      currentTime - lastClickTime < this.DOUBLE_CLICK_THRESHOLD &&
      Math.abs(point.x - lastPosition.x) < 5 &&
      Math.abs(point.y - lastPosition.y) < 5
    
    // Update click tracking
    this.state.set('lastClickTime', currentTime)
    this.state.set('lastClickPosition', { x: point.x, y: point.y })
    
    // If we're editing and click elsewhere, commit the text
    if (this.state.get('isEditing') && !isDoubleClick && !this.state.get('isCommitting')) {
      const clickedObject = canvas.getObjectAtPoint(point)
      const currentText = this.state.get('currentText')
      
      // Only commit if we clicked outside the current text
      if (!clickedObject || clickedObject.node !== currentText) {
        await this.commitText()
        return
      }
    }
    
    // Check if clicking on existing text
    const clickedObject = canvas.getObjectAtPoint(point)
    if (clickedObject && this.isTextObject(clickedObject)) {
      // Enter edit mode for existing text
      const textNode = clickedObject.node as Konva.Text
      this.enterEditMode(textNode, clickedObject)
      return
    }
    
    // Create new text at pointer position
    await this.createNewText(point)
  }
  
  /**
   * Handle key down events
   */
  onKeyDown(event: KeyboardEvent): void {
    // Handle escape to cancel editing
    if (event.key === 'Escape' && this.state.get('isEditing')) {
      this.cancelEditing()
    }
  }
  
  /**
   * Check if a canvas object is a text object
   */
  protected isTextObject(obj: CanvasObject): boolean {
    return obj.type === 'text'
  }
  
  /**
   * Enter edit mode for a text object
   */
  protected enterEditMode(textNode: Konva.Text, canvasObject: CanvasObject): void {
    this.state.setState({
      currentText: textNode,
      originalText: textNode.text(),
      isEditing: true,
      isCommitting: false
    })
    
    // Hide the text node while editing
    textNode.hide()
    
    // Create textarea for editing
    this.createTextarea(textNode, canvasObject)
    
    // Focus textarea
    if (this.textarea) {
      this.textarea.focus()
      this.textarea.select()
    }
    
    // Redraw layer
    const layer = textNode.getLayer()
    if (layer) layer.batchDraw()
  }
  
  /**
   * Create text object with tool-specific properties
   * Subclasses must implement this to create their specific text type
   */
  protected abstract createTextObject(x: number, y: number): Konva.Text
  
  /**
   * Create new text object at the specified position
   */
  protected async createNewText(point: Point): Promise<void> {
    const canvas = this.getCanvas()
    
    const textNode = this.createTextObject(point.x, point.y)
    
    // Create canvas object
    const canvasObject: CanvasObject = {
      id: `text-${Date.now()}`,
      type: 'text',
      name: 'Text',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: point.x,
      y: point.y,
      width: textNode.width(),
      height: textNode.height(),
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 0,
      filters: [],
      adjustments: [],
      data: {
        content: textNode.text(),
        font: this.getOption('fontFamily') as string || 'Arial',
        fontSize: this.getOption('fontSize') as number || 60,
        color: this.getOption('color') as string || '#000000',
        align: this.getOption('alignment') as 'left' | 'center' | 'right' || 'left',
        lineHeight: this.getOption('lineHeight') as number || 1.2,
        letterSpacing: this.getOption('letterSpacing') as number || 0
      },
      metadata: {
        konvaNode: textNode
      }
    }
    
    // Add object to canvas using object-based API
    canvas.addObject(canvasObject)
    
    // Emit event
    if (this.executionContext) {
      await this.executionContext.emit(new ObjectAddedEvent(
        'canvas',
        canvasObject,
        this.executionContext.getMetadata()
      ))
    }
    
    // Enter edit mode immediately
    this.enterEditMode(textNode, canvasObject)
  }
  
  /**
   * Create textarea for text editing
   */
  protected createTextarea(textNode: Konva.Text, canvasObject: CanvasObject): void {
    // Remove existing textarea if any
    this.cleanupTextarea()
    
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
    const textData = canvasObject.data as import('@/lib/editor/objects/types').TextData
    this.textarea.value = textData.content || textNode.text()
    this.textarea.style.position = 'absolute'
    this.textarea.style.top = `${areaPosition.y}px`
    this.textarea.style.left = `${areaPosition.x}px`
    this.textarea.style.width = `${Math.max(textNode.width(), 200)}px`
    this.textarea.style.height = `${Math.max(textNode.height() + 20, 40)}px`
    this.textarea.style.padding = `${textNode.padding() || 5}px`
    this.textarea.style.margin = '0'
    this.textarea.style.overflow = 'hidden'
    this.textarea.style.background = 'rgba(255, 255, 255, 0.9)'
    this.textarea.style.border = '1px solid #ccc'
    this.textarea.style.borderRadius = '2px'
    this.textarea.style.outline = 'none'
    this.textarea.style.resize = 'none'
    this.textarea.style.transformOrigin = 'left top'
    
    // Apply text styles
    this.updateTextareaStyle(textNode)
    
    // Handle input
    this.textarea.addEventListener('input', () => {
      this.handleTextInput()
    })
    
    // Handle blur (finish editing)
    this.textarea.addEventListener('blur', () => {
      this.commitText()
    })
    
    // Handle special keys
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancelEditing()
      } else if (e.key === 'Enter' && e.ctrlKey) {
        this.commitText()
      }
    })
  }
  
  /**
   * Update textarea styling to match text node
   */
  protected updateTextareaStyle(textNode: Konva.Text): void {
    if (!this.textarea) return
    
    this.textarea.style.fontFamily = textNode.fontFamily()
    this.textarea.style.fontSize = `${Math.max(textNode.fontSize() * 0.8, 14)}px`
    this.textarea.style.color = textNode.fill() as string
    this.textarea.style.fontWeight = this.getOption('bold') ? 'bold' : 'normal'
    this.textarea.style.fontStyle = this.getOption('italic') ? 'italic' : 'normal'
    this.textarea.style.textDecoration = this.getOption('underline') ? 'underline' : 'none'
  }
  
  /**
   * Handle text input changes
   */
  protected handleTextInput(): void {
    // This can be overridden by subclasses for live preview
  }
  
  /**
   * Clean up textarea
   */
  protected cleanupTextarea(): void {
    if (this.textarea) {
      this.textarea.remove()
      this.textarea = null
    }
  }
  
  /**
   * Commit the current text editing
   */
  protected async commitText(): Promise<void> {
    const currentText = this.state.get('currentText')
    
    if (!currentText || !this.textarea || this.state.get('isCommitting')) return
    
    // Set guard flag to prevent re-entry
    this.state.set('isCommitting', true)
    
    try {
      const canvas = this.getCanvas()
      const finalText = this.textarea.value
      
      // Update text node
      currentText.text(finalText)
      currentText.show()
      
      // Find canvas object by matching the Konva node
      let canvasObject: CanvasObject | null = null
      const allObjects = canvas.getAllObjects()
      for (const obj of allObjects) {
        // Match by Konva node reference stored in metadata
        if (obj.type === 'text' && obj.metadata?.konvaNode === currentText) {
          canvasObject = obj
          break
        }
      }
      
      // Emit event if text changed
      if (canvasObject) {
        const currentTextData = canvasObject.data as import('@/lib/editor/objects/types').TextData
        if (currentTextData.content !== finalText) {
          const previousData = canvasObject.data
          canvasObject.data = {
            ...currentTextData,
            content: finalText
          }
        
          if (this.executionContext) {
            await this.executionContext.emit(new ObjectModifiedEvent(
              'canvas',
              canvasObject,
              { data: previousData },
              { data: canvasObject.data },
              this.executionContext.getMetadata()
            ))
          }
        }
      }
      
      // Clean up textarea
      this.cleanupTextarea()
      
      // Redraw
      const layer = currentText.getLayer()
      if (layer) layer.batchDraw()
      
      // Reset state
      this.state.setState({
        currentText: null,
        isEditing: false,
        originalText: '',
        isCommitting: false
      })
    } catch (error) {
      console.error('Error committing text:', error)
      // Ensure we reset the committing flag even on error
      this.state.set('isCommitting', false)
    }
  }
  
  /**
   * Cancel text editing without saving changes
   */
  protected cancelEditing(): void {
    const currentText = this.state.get('currentText')
    const originalText = this.state.get('originalText')
    
    if (!currentText) return
    
    // Restore original text
    currentText.text(originalText)
    currentText.show()
    
    // Clean up textarea
    this.cleanupTextarea()
    
    // Redraw
    const layer = currentText.getLayer()
    if (layer) layer.batchDraw()
    
    // Reset state
    this.state.setState({
      currentText: null,
      isEditing: false,
      originalText: '',
      isCommitting: false
    })
  }
  
  /**
   * Update text style based on tool options
   */
  protected onOptionChange(key: string, value: unknown): void {
    const currentText = this.state.get('currentText')
    if (!currentText) return
    
    // Apply each option to the text
    switch (key) {
      case 'fontFamily':
        currentText.fontFamily(value as string)
        break
      case 'fontSize':
        currentText.fontSize(value as number)
        break
      case 'color':
        currentText.fill(value as string)
        break
      case 'alignment':
        currentText.align(value as string)
        break
      case 'bold':
      case 'italic':
        currentText.fontStyle(this.getFontStyle())
        break
      case 'underline':
        currentText.textDecoration(value ? 'underline' : '')
        break
      case 'letterSpacing':
        currentText.letterSpacing(value as number)
        break
      case 'lineHeight':
        currentText.lineHeight(value as number)
        break
    }
    
    // Update textarea if editing
    if (this.textarea && this.state.get('isEditing')) {
      this.updateTextareaStyle(currentText)
    }
    
    // Redraw
    const layer = currentText.getLayer()
    if (layer) layer.batchDraw()
  }
  
  /**
   * Get font style string based on bold/italic options
   */
  protected getFontStyle(): string {
    const bold = this.getOption('bold') as boolean
    const italic = this.getOption('italic') as boolean
    
    if (bold && italic) return 'bold italic'
    if (bold) return 'bold'
    if (italic) return 'italic'
    return 'normal'
  }
} 