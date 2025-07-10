import { Type } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTextTool } from '../base/BaseTextTool'
import type { ToolEvent, Point, CanvasObject } from '@/lib/editor/canvas/types'

/**
 * Type on Path Tool - Allows text to follow the curve of a path
 * Click on any path object to add text that follows its curve
 * Konva implementation
 */
export class TypeOnPathTool extends BaseTextTool {
  // Tool identification
  id = TOOL_IDS.TYPE_ON_PATH
  name = 'Type on a Path Tool'
  icon = Type
  cursor = 'text'
  shortcut = undefined // Access via tool palette
  
  // Track the selected path
  private selectedPath: Konva.Shape | null = null
  private pathHoverTimeout: NodeJS.Timeout | null = null
  private originalPathStroke: string | null = null
  private originalPathStrokeWidth: number | null = null
  
  /**
   * Override setup to add path detection
   */
  protected setupTool(): void {
    super.setupTool()
    
    // Set up path-specific options
    this.setOption('pathOffset', 0) // Distance along path (0-1)
    this.setOption('pathSide', 'top') // 'top' or 'bottom' of path
  }
  
  /**
   * Override cleanup to clear path selection
   */
  protected cleanupTool(): void {
    super.cleanupTool()
    
    this.clearPathSelection()
    if (this.pathHoverTimeout) {
      clearTimeout(this.pathHoverTimeout)
      this.pathHoverTimeout = null
    }
  }
  
  /**
   * Override mouse move to detect paths
   */
  async onMouseMove(event: ToolEvent): Promise<void> {
    if (this.state.get('isEditing')) return
    
    const canvas = this.getCanvas()
    const clickedObject = canvas.getObjectAtPoint(event.point)
    
    if (clickedObject && this.isPathObject(clickedObject)) {
      // Highlight the path
      if (this.selectedPath !== clickedObject.node) {
        this.clearPathSelection()
        this.selectedPath = clickedObject.node as Konva.Shape
        
        // Store original properties
        this.originalPathStroke = this.selectedPath.stroke() as string
        this.originalPathStrokeWidth = this.selectedPath.strokeWidth()
        
        // Highlight the path
        this.selectedPath.stroke('#0066ff')
        this.selectedPath.strokeWidth(2)
        
        const layer = this.selectedPath.getLayer()
        if (layer) layer.batchDraw()
      }
    } else {
      // Clear selection if not hovering over a path
      if (this.pathHoverTimeout) {
        clearTimeout(this.pathHoverTimeout)
      }
      
      this.pathHoverTimeout = setTimeout(() => {
        this.clearPathSelection()
      }, 100)
    }
  }
  
  /**
   * Override mouse down to handle path selection
   */
  async onMouseDown(event: ToolEvent): Promise<void> {
    const canvas = this.getCanvas()
    const clickedObject = canvas.getObjectAtPoint(event.point)
    
    // If clicking on a path, create text on that path
    if (clickedObject && this.isPathObject(clickedObject) && !this.state.get('isEditing')) {
      this.selectedPath = clickedObject.node as Konva.Shape
      await this.createNewText(event.point)
      return
    }
    
    // Otherwise use default behavior
    await super.onMouseDown(event)
  }
  
  /**
   * Check if a canvas object is a path object
   */
  private isPathObject(obj: CanvasObject): boolean {
    return obj.type === 'shape' // In Konva, paths are typically shapes
  }
  
  /**
   * Clear path selection and restore original properties
   */
  private clearPathSelection(): void {
    if (this.selectedPath) {
      // Restore original properties
      if (this.originalPathStroke !== null) {
        this.selectedPath.stroke(this.originalPathStroke)
      }
      if (this.originalPathStrokeWidth !== null) {
        this.selectedPath.strokeWidth(this.originalPathStrokeWidth)
      }
      
      const layer = this.selectedPath.getLayer()
      if (layer) layer.batchDraw()
      
      this.selectedPath = null
      this.originalPathStroke = null
      this.originalPathStrokeWidth = null
    }
  }
  
  /**
   * Create text that follows a path
   */
  protected createTextObject(x: number, y: number): Konva.Text {
    // Get text options
    const fontFamily = this.getOption('fontFamily') as string
    const fontSize = this.getOption('fontSize') as number
    const color = this.getOption('color') as string
    const bold = this.getOption('bold') as boolean
    const italic = this.getOption('italic') as boolean
    const underline = this.getOption('underline') as boolean
    
    if (this.selectedPath) {
      // Create text that will follow the path
      const text = new Konva.Text({
        x,
        y,
        text: ' ', // Start with space
        fontFamily,
        fontSize,
        fill: color,
        fontStyle: this.getFontStyle(),
        textDecoration: underline ? 'underline' : '',
        draggable: true,
        // Store reference to the path
        id: `path-text-${Date.now()}`
      })
      
      // Set up text-on-path behavior
      this.setupTextOnPath(text, this.selectedPath)
      
      return text
    } else {
      // Create regular text if no path selected
      return new Konva.Text({
        x,
        y,
        text: ' ',
        fontFamily,
        fontSize,
        fill: color,
        fontStyle: this.getFontStyle(),
        textDecoration: underline ? 'underline' : '',
        draggable: true
      })
    }
  }
  
  /**
   * Set up text to follow path using Konva's path following
   */
  private setupTextOnPath(text: Konva.Text, path: Konva.Shape): void {
    // This is a simplified implementation
    // In a full implementation, you would:
    // 1. Get the path data from the shape
    // 2. Calculate character positions along the path
    // 3. Rotate each character to match path direction
    // 4. Update positions on text change
    
    // For now, just position the text at the start of the path
    const pathBounds = path.getClientRect()
    text.x(pathBounds.x)
    text.y(pathBounds.y)
    
    // Store path reference for future updates
    text.setAttr('pathReference', path)
    
    // TODO: Implement proper path following algorithm
    console.log('Text on path setup - full implementation needed for path following')
  }
  
  /**
   * Override option change to update path text
   */
  protected onOptionChange(key: string, value: unknown): void {
    super.onOptionChange(key, value)
    
    // Handle path-specific options
    if (key === 'pathOffset' || key === 'pathSide') {
      const currentText = this.state.get('currentText')
      if (currentText && currentText.getAttr('pathReference')) {
        // Update text position along path
        this.updateTextOnPath(currentText)
      }
    }
  }
  
  /**
   * Update text position along path
   */
  private updateTextOnPath(text: Konva.Text): void {
    const path = text.getAttr('pathReference') as Konva.Shape
    if (!path) return
    
    // TODO: Implement path following position updates
    console.log('Update text on path - full implementation needed')
  }
  
  /**
   * Override commit to clear path selection
   */
  protected async commitText(): Promise<void> {
    await super.commitText()
    this.clearPathSelection()
  }
  
  /**
   * Override cancel to clear path selection
   */
  protected cancelEditing(): void {
    super.cancelEditing()
    this.clearPathSelection()
  }
}

export const typeOnPathTool = new TypeOnPathTool() 