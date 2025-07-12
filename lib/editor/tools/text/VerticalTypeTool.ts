import { Type } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { KonvaObjectAddedEvent, KonvaObjectModifiedEvent } from '@/lib/events/canvas/CanvasEvents'

/**
 * Vertical Type Tool - Creates vertical text
 * Konva implementation with character rotation for vertical layout
 */
export class VerticalTypeTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.TYPE_VERTICAL
  name = 'Vertical Type Tool'
  icon = Type
  cursor = 'text'
  shortcut = 'Shift+T'
  
  // Text state
  private activeText: Konva.Group | null = null
  private editingGroup: Konva.Group | null = null
  private textChars: Konva.Text[] = []
  private textarea: HTMLTextAreaElement | null = null
  
  protected setupTool(): void {
    // Set default text options
    this.setOption('fontFamily', 'Arial')
    this.setOption('fontSize', 60)
    this.setOption('color', '#000000')
    this.setOption('letterSpacing', 0)
    this.setOption('lineHeight', 1.2)
    this.setOption('bold', false)
    this.setOption('italic', false)
  }
  
  protected cleanupTool(): void {
    // Finish any active editing
    if (this.editingGroup) {
      this.finishEditing()
    }
    
    // Reset state
    this.activeText = null
    this.editingGroup = null
    this.textChars = []
    this.textarea = null
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    const canvas = this.getCanvas()
    const point = event.point
    
    // Check if clicking on existing vertical text
    const clickedObject = canvas.getObjectAtPoint(point)
    
    if (clickedObject && clickedObject.type === 'verticalText') {
      // Start editing existing text
      const textGroup = clickedObject.node as Konva.Group
      this.startEditing(textGroup, clickedObject)
    } else {
      // Finish any current editing
      if (this.editingGroup) {
        await this.finishEditing()
      }
      
      // Create new vertical text at click position
      await this.createNewVerticalText(point)
    }
  }
  
  onKeyDown(event: KeyboardEvent): void {
    // Handle escape to cancel editing
    if (event.key === 'Escape' && this.editingGroup) {
      this.cancelEditing()
    }
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    // Apply text style changes to active text
    if (this.activeText && this.textChars.length > 0) {
      switch (key) {
        case 'fontFamily':
          this.textChars.forEach(char => char.fontFamily(value as string))
          break
        case 'fontSize':
          this.updateVerticalLayout()
          break
        case 'color':
          this.textChars.forEach(char => char.fill(value as string))
          break
        case 'bold':
        case 'italic':
          this.textChars.forEach(char => char.fontStyle(this.getFontStyle()))
          break
        case 'letterSpacing':
        case 'lineHeight':
          this.updateVerticalLayout()
          break
      }
      
      // Redraw
      const layer = this.activeText.getLayer()
      if (layer) layer.batchDraw()
    }
  }
  
  /**
   * Create new vertical text
   */
  private async createNewVerticalText(point: Point): Promise<void> {
    const canvas = this.getCanvas()
    
    // Create group for vertical text
    const group = new Konva.Group({
      x: point.x,
      y: point.y,
      draggable: true
    })
    
    // Create canvas object
    const canvasObject: CanvasObject = {
      id: `vertical-text-${Date.now()}`,
      type: 'verticalText',
      name: 'Vertical Text',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: point.x,
      y: point.y,
      width: 50, // Initial width estimate
      height: 200, // Initial height estimate
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 0,
      filters: [],
      adjustments: [],
      data: {
        content: ' ', // Start with space
        font: this.getOption('fontFamily') as string || 'Arial',
        fontSize: this.getOption('fontSize') as number || 16,
        color: this.getOption('color') as string || '#000000',
        align: 'left' as const,
        direction: 'vertical' as const,
        lineHeight: this.getOption('lineHeight') as number || 1.2,
        letterSpacing: this.getOption('letterSpacing') as number || 0
      },
      metadata: {
        konvaNode: group,
        fontFamily: this.getOption('fontFamily') as string,
        fontSize: this.getOption('fontSize') as number,
        isVerticalText: true
      }
    }
    
    // Add object to canvas using object-based API
    canvas.addObject(canvasObject)
    
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
          x: canvasObject.x,
          y: canvasObject.y,
          width: canvasObject.width,
          height: canvasObject.height,
          rotation: canvasObject.rotation,
          scaleX: canvasObject.scaleX,
          scaleY: canvasObject.scaleY,
          data: canvasObject.data
        },
        'default-layer', // Default layer ID for object-based system
        this.executionContext.getMetadata()
      ))
    }
    
    // Start editing immediately
    this.startEditing(group, canvasObject)
  }
  
  /**
   * Start editing vertical text
   */
  private startEditing(textGroup: Konva.Group, canvasObject: CanvasObject): void {
    this.editingGroup = textGroup
    this.activeText = textGroup
    
    // Hide the group while editing
    textGroup.hide()
    
    // Create textarea for editing
    const textData = canvasObject.data as import('@/lib/editor/objects/types').TextData
    this.createTextarea(textGroup, textData.content)
    
    // Focus textarea
    if (this.textarea) {
      this.textarea.focus()
      // Select all text if it's just a space
      if (this.textarea.value.trim() === '') {
        this.textarea.select()
      }
    }
    
    // Redraw layer
    const layer = textGroup.getLayer()
    if (layer) layer.batchDraw()
  }
  
  /**
   * Create textarea for text editing
   */
  private createTextarea(textGroup: Konva.Group, currentText: string): void {
    // Remove existing textarea if any
    if (this.textarea) {
      this.textarea.remove()
    }
    
    // Create new textarea
    this.textarea = document.createElement('textarea')
    document.body.appendChild(this.textarea)
    
    // Get absolute position of group
    const groupPosition = textGroup.absolutePosition()
    const stage = textGroup.getStage()
    if (!stage) return
    
    const stageBox = stage.container().getBoundingClientRect()
    const areaPosition = {
      x: stageBox.left + groupPosition.x,
      y: stageBox.top + groupPosition.y
    }
    
    // Set textarea properties
    this.textarea.value = currentText
    this.textarea.style.position = 'absolute'
    this.textarea.style.top = `${areaPosition.y}px`
    this.textarea.style.left = `${areaPosition.x}px`
    this.textarea.style.width = '200px'
    this.textarea.style.height = '100px'
    this.textarea.style.padding = '5px'
    this.textarea.style.margin = '0'
    this.textarea.style.overflow = 'auto'
    this.textarea.style.background = 'rgba(255, 255, 255, 0.9)'
    this.textarea.style.border = '1px solid #ccc'
    this.textarea.style.borderRadius = '2px'
    this.textarea.style.outline = 'none'
    this.textarea.style.resize = 'both'
    
    // Apply text styles
    this.textarea.style.fontFamily = this.getOption('fontFamily') as string
    this.textarea.style.fontSize = '14px' // Smaller for editing
    this.textarea.style.color = this.getOption('color') as string
    this.textarea.style.fontWeight = this.getOption('bold') ? 'bold' : 'normal'
    this.textarea.style.fontStyle = this.getOption('italic') ? 'italic' : 'normal'
    
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
   * Create vertical text layout from string
   */
  private createVerticalLayout(group: Konva.Group, text: string): void {
    // Clear existing characters
    group.destroyChildren()
    this.textChars = []
    
    // Split text into lines
    const lines = text.split('\n')
    const fontSize = this.getOption('fontSize') as number
    const letterSpacing = this.getOption('letterSpacing') as number
    const lineHeight = this.getOption('lineHeight') as number
    const lineSpacing = fontSize * 0.5 // Space between vertical lines
    
    let xOffset = 0
    
    lines.forEach((line, _lineIndex) => {
      let yOffset = 0
      
      // Create character for each letter
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        const charText = new Konva.Text({
          x: xOffset,
          y: yOffset,
          text: char,
          fontSize: fontSize,
          fontFamily: this.getOption('fontFamily') as string,
          fill: this.getOption('color') as string,
          fontStyle: this.getFontStyle()
        })
        
        group.add(charText)
        this.textChars.push(charText)
        
        // Move down for next character
        yOffset += fontSize * lineHeight + letterSpacing
      }
      
      // Move right for next line
      xOffset += lineSpacing
    })
  }
  
  /**
   * Update vertical layout when options change
   */
  private updateVerticalLayout(): void {
    if (!this.editingGroup || !this.textarea) return
    
    // Recreate layout with current text
    this.createVerticalLayout(this.editingGroup, this.textarea.value)
  }
  
  /**
   * Finish editing and apply changes
   */
  private async finishEditing(): Promise<void> {
    if (!this.editingGroup || !this.textarea) return
    
    const canvas = this.getCanvas()
    const finalText = this.textarea.value
    
    // Create vertical layout
    this.createVerticalLayout(this.editingGroup, finalText)
    
    // Show group
    this.editingGroup.show()
    
    // Find canvas object by matching the Konva node
    let canvasObject: CanvasObject | null = null
    const allObjects = canvas.getAllObjects()
    for (const obj of allObjects) {
      // Match by Konva node reference stored in metadata
      if (obj.type === 'verticalText' && obj.metadata?.konvaNode === this.editingGroup) {
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
          await this.executionContext.emit(new KonvaObjectModifiedEvent(
            'canvas',
            canvasObject.id,
            { data: previousData },
            { data: canvasObject.data },
            this.executionContext.getMetadata()
          ))
        }
      }
    }
    
    // Clean up textarea
    if (this.textarea) {
      this.textarea.remove()
      this.textarea = null
    }
    
    // Redraw
    const layer = this.editingGroup.getLayer()
    if (layer) layer.batchDraw()
    
    // Clear editing state
    this.editingGroup = null
  }
  
  /**
   * Cancel editing without saving
   */
  private cancelEditing(): void {
    if (!this.editingGroup) return
    
    // Show group without changes
    this.editingGroup.show()
    
    // Clean up textarea
    if (this.textarea) {
      this.textarea.remove()
      this.textarea = null
    }
    
    // Redraw
    const layer = this.editingGroup.getLayer()
    if (layer) layer.batchDraw()
    
    // Clear editing state
    this.editingGroup = null
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
   * Apply vertical text for AI operations
   */
  async applyWithContext(
    text: string,
    position: Point,
    options?: {
      fontFamily?: string
      fontSize?: number
      color?: string
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
    
    // Create text at position
    await this.createNewVerticalText(position)
    
    // Set the text content
    if (this.editingGroup && this.textarea) {
      this.textarea.value = text
      await this.finishEditing()
    }
  }
}

// Export singleton instance
export const verticalTypeTool = new VerticalTypeTool() 