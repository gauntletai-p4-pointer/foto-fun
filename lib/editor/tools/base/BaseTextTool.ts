import { BaseTool } from './BaseTool'
import type { Canvas, TPointerEventInfo } from 'fabric'
import { IText, Textbox } from 'fabric'
import { createToolState } from '../utils/toolState'
import type { ToolOption } from '@/store/toolOptionsStore'
import { AddTextCommand } from '../../commands/text/AddTextCommand'
import { EditTextCommand } from '../../commands/text/EditTextCommand'

// Extend TextToolState to satisfy Record constraint
interface ExtendedTextToolState extends Record<string, unknown> {
  currentText: IText | Textbox | null
  isEditing: boolean
  originalText: string
  lastClickTime: number
  lastClickPosition: { x: number; y: number }
  isCommitting: boolean // Add guard flag to prevent re-entry
}

/**
 * Base class for text tools (horizontal, vertical, mask, path)
 * Provides common text editing functionality and state management
 */
export abstract class BaseTextTool extends BaseTool {
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
  
  // Store bound event handlers for cleanup
  private textEventHandlers = new Map<string, () => void>()
  
  /**
   * Tool-specific setup
   */
  protected setupTool(canvas: Canvas): void {
    // Disable object selection while using text tools
    canvas.selection = false
    
    // Set up event handlers
    this.addCanvasEvent('mouse:down', (e: unknown) => this.handleMouseDown(e as TPointerEventInfo<MouseEvent>))
    this.addCanvasEvent('text:changed', () => this.handleTextChanged())
    // Remove the problematic global text:editing:exited listener
    this.addCanvasEvent('selection:created', (e: unknown) => this.handleSelectionCreated(e as { selected: Array<IText | Textbox> }))
    this.addCanvasEvent('selection:updated', (e: unknown) => this.handleSelectionUpdated(e as { selected: Array<IText | Textbox> }))
    
    // Subscribe to tool options changes
    this.subscribeToToolOptions((options) => {
      this.updateTextStyle(options)
    })
  }
  
  /**
   * Tool-specific cleanup
   */
  protected cleanup(canvas: Canvas): void {
    // Commit any active text
    if (this.state.get('isEditing') && !this.state.get('isCommitting')) {
      this.commitText()
    }
    
    // Clean up text event handlers
    this.cleanupTextEventHandlers()
    
    // Reset state
    this.state.reset()
    
    // Re-enable object selection
    canvas.selection = true
  }
  
  /**
   * Handle mouse down - create or edit text
   */
  protected handleMouseDown(e: TPointerEventInfo<MouseEvent>): void {
    if (!this.canvas) return
    
    const pointer = this.canvas.getPointer(e.e)
    const currentTime = Date.now()
    const lastClickTime = this.state.get('lastClickTime')
    const lastPosition = this.state.get('lastClickPosition')
    
    // Check for double-click
    const isDoubleClick = 
      currentTime - lastClickTime < this.DOUBLE_CLICK_THRESHOLD &&
      Math.abs(pointer.x - lastPosition.x) < 5 &&
      Math.abs(pointer.y - lastPosition.y) < 5
    
    // Update click tracking
    this.state.set('lastClickTime', currentTime)
    this.state.set('lastClickPosition', { x: pointer.x, y: pointer.y })
    
    // If we're editing and click elsewhere, commit the text
    if (this.state.get('isEditing') && !isDoubleClick && !this.state.get('isCommitting')) {
      const target = this.canvas.findTarget(e.e)
      const currentText = this.state.get('currentText')
      
      // Only commit if we clicked outside the current text
      if (target !== currentText) {
        this.commitText()
        return
      }
    }
    
    // Check if clicking on existing text
    const target = this.canvas.findTarget(e.e)
    if (target && (target instanceof IText || target instanceof Textbox)) {
      // Enter edit mode for existing text
      this.enterEditMode(target)
      return
    }
    
    // Create new text at pointer position
    this.track('createText', () => {
      this.createNewText(pointer.x, pointer.y)
    })
  }
  
  /**
   * Enter edit mode for a text object
   */
  protected enterEditMode(textObject: IText | Textbox): void {
    // Clean up any previous text handlers
    this.cleanupTextEventHandlers()
    
    this.state.setState({
      currentText: textObject,
      originalText: textObject.text || '',
      isEditing: true,
      isCommitting: false
    })
    
    // Set up object-specific event handlers
    const exitHandler = () => {
      if (!this.state.get('isCommitting')) {
        this.commitText()
      }
    }
    
    // Store handlers for cleanup
    this.textEventHandlers.set('editing:exited', exitHandler)
    
    // Attach handler to the specific text object
    textObject.on('editing:exited', exitHandler)
    
    textObject.enterEditing()
    textObject.selectAll()
  }
  
  /**
   * Create text object with tool-specific properties
   * Subclasses must implement this to create their specific text type
   */
  protected abstract createTextObject(x: number, y: number): IText | Textbox
  
  /**
   * Create new text object at the specified position
   */
  protected createNewText(x: number, y: number): void {
    if (!this.canvas) return
    
    const textObject = this.createTextObject(x, y)
    
    // Ensure proper Unicode/emoji support
    textObject.set('splitByGrapheme', true)
    
    // Temporarily add to canvas for editing (will be removed and re-added by command)
    this.canvas.add(textObject)
    this.canvas.setActiveObject(textObject)
    
    // Enter edit mode
    this.enterEditMode(textObject)
    
    // Remove from canvas before command execution
    this.canvas.remove(textObject)
    
    // Record command for undo/redo - this will add to canvas and layer properly
    const command = new AddTextCommand(this.canvas, textObject)
    this.executeCommand(command)
    
    this.canvas.renderAll()
  }
  
  /**
   * Handle text changed event
   */
  protected handleTextChanged(): void {
    const currentText = this.state.get('currentText')
    if (!currentText) return
    
    // Update any UI that depends on text content
    // This could include character count, etc.
    this.canvas?.renderAll()
  }
  
  /**
   * Clean up text-specific event handlers
   */
  protected cleanupTextEventHandlers(): void {
    const currentText = this.state.get('currentText')
    if (!currentText) return
    
    // Remove all stored handlers
    this.textEventHandlers.forEach((handler, event) => {
      // Use type assertion for the event type
      currentText.off(event as 'editing:exited', handler)
    })
    
    this.textEventHandlers.clear()
  }
  
  /**
   * Handle selection created event
   */
  protected handleSelectionCreated(e: { selected: Array<IText | Textbox> }): void {
    const textObject = e.selected[0]
    if (textObject) {
      // Type guard to ensure it's a text object
      const isTextObject = 'text' in textObject && 
                          'enterEditing' in textObject && 
                          typeof textObject.text === 'string'
      
      if (isTextObject) {
        this.state.setState({
          currentText: textObject as IText | Textbox,
          originalText: (textObject as IText | Textbox).text || ''
        })
      }
    }
  }
  
  /**
   * Handle selection updated event
   */
  protected handleSelectionUpdated(e: { selected: Array<IText | Textbox> }): void {
    this.handleSelectionCreated(e)
  }
  
  /**
   * Commit the current text editing
   */
  protected commitText(): void {
    const currentText = this.state.get('currentText')
    const originalText = this.state.get('originalText')
    
    if (!currentText || !this.canvas || this.state.get('isCommitting')) return
    
    // Set guard flag to prevent re-entry
    this.state.set('isCommitting', true)
    
    try {
      // Clean up event handlers first
      this.cleanupTextEventHandlers()
      
      // Exit editing mode if still editing
      if (currentText.isEditing) {
        currentText.exitEditing()
      }
      
      // If text is empty, remove it
      if (!currentText.text || currentText.text.trim() === '') {
        this.canvas.remove(currentText)
        this.canvas.renderAll()
      } else if (currentText.text !== originalText) {
        // Record edit command if text changed
        const command = new EditTextCommand(currentText, originalText, currentText.text)
        this.executeCommand(command)
      }
      
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
   * Update text style based on tool options
   */
  protected updateTextStyle(options: ToolOption[]): void {
    const currentText = this.state.get('currentText')
    if (!currentText || !this.state.get('isEditing')) return
    
    // Apply each option to the text
    options.forEach(option => {
      switch (option.id) {
        case 'fontFamily':
          currentText.set('fontFamily', option.value as string)
          break
        case 'fontSize':
          currentText.set('fontSize', option.value as number)
          break
        case 'color':
          currentText.set('fill', option.value as string)
          break
        case 'alignment':
          currentText.set('textAlign', option.value as string)
          break
        case 'bold':
          currentText.set('fontWeight', option.value ? 'bold' : 'normal')
          break
        case 'italic':
          currentText.set('fontStyle', option.value ? 'italic' : 'normal')
          break
        case 'underline':
          currentText.set('underline', option.value as boolean)
          break
      }
    })
    
    this.canvas?.renderAll()
  }
  
  /**
   * Get option value from tool options
   */
  protected getOptionValue<T = unknown>(optionId: string): T | undefined {
    return this.toolOptionsStore.getOptionValue<T>(this.id, optionId)
  }
} 