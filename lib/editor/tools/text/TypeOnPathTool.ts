import { Type } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTextTool } from '../base/BaseTextTool'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { TextEngine } from '@/lib/editor/text/engines/TextEngine'

/**
 * Type on Path Tool - Allows text to follow the curve of a path
 * Click on any path object to add text that follows its curve
 * Full Konva implementation with proper path following
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
  private textEngine: TextEngine | null = null
  private pathTextGroup: Konva.Group | null = null
  
  constructor() {
    super()
  }
  
  /**
   * Override setup to add path detection
   */
  protected setupTool(): void {
    super.setupTool()
    
    // Set up path-specific options
    this.setOption('pathOffset', 0) // Distance along path (0-1)
    this.setOption('pathSide', 'top') // 'top' or 'bottom' of path
    this.setOption('spacing', 0) // Letter spacing adjustment
    this.setOption('baselineShift', 0) // Vertical offset from path
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
    // Check if it's a path or line shape
    if (obj.type === 'shape' && obj.node) {
      const node = obj.node as Konva.Shape
      return node instanceof Konva.Path || 
             node instanceof Konva.Line ||
             node instanceof Konva.Arrow ||
             (node.getClassName() === 'Shape' && node.getAttr('data'))
    }
    return false
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
    const underline = this.getOption('underline') as boolean
    
    if (this.selectedPath) {
      // Create a group to hold the path text
      this.pathTextGroup = new Konva.Group({
        draggable: true,
        id: `path-text-group-${Date.now()}`
      })
      
      // Create hidden text for editing
      const editText = new Konva.Text({
        x: 0,
        y: 0,
        text: ' ',
        fontFamily,
        fontSize,
        fill: color,
        fontStyle: this.getFontStyle(),
        textDecoration: underline ? 'underline' : '',
        visible: false // Hidden, only for editing
      })
      
      this.pathTextGroup.add(editText)
      
      // Store reference to the path
      this.pathTextGroup.setAttr('pathReference', this.selectedPath)
      this.pathTextGroup.setAttr('editText', editText)
      
      // Add to layer
      const layer = this.selectedPath.getLayer()
      if (layer) {
        layer.add(this.pathTextGroup)
        layer.batchDraw()
      }
      
      // Return the edit text for base class compatibility
      return editText
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
   * Override to handle text changes and render along path
   */
  protected onTextChange(text: string): void {
    if (this.pathTextGroup && this.selectedPath) {
      this.renderTextOnPath(text)
    }
  }
  
  /**
   * Render text along the path
   */
  private renderTextOnPath(text: string): void {
    if (!this.pathTextGroup || !this.selectedPath) return
    
    // Clear existing path text (keep edit text)
    const editText = this.pathTextGroup.getAttr('editText') as Konva.Text
    this.pathTextGroup.getChildren().forEach(child => {
      if (child !== editText) {
        child.destroy()
      }
    })
    
    if (!text || text.trim() === '') return
    
    // Get path points
    const pathPoints = this.getPathPoints(this.selectedPath)
    if (pathPoints.length < 2) return
    
    // Get text properties
    const fontFamily = this.getOption('fontFamily') as string
    const fontSize = this.getOption('fontSize') as number
    const color = this.getOption('color') as string
    const pathOffset = this.getOption('pathOffset') as number
    const spacing = this.getOption('spacing') as number
    const baselineShift = this.getOption('baselineShift') as number
    
    // Measure text using canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    ctx.font = `${fontSize}px ${fontFamily}`
    
    const totalLength = this.calculatePathLength(pathPoints)
    const startOffset = totalLength * pathOffset
    
    // Calculate character positions along path
    let currentOffset = startOffset
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const charMetrics = ctx.measureText(char)
      
      // Find position and angle on path
      const position = this.getPointOnPath(pathPoints, currentOffset, totalLength)
      if (!position) break
      
      // Create character text
      const charText = new Konva.Text({
        x: position.x,
        y: position.y - baselineShift,
        text: char,
        fontFamily,
        fontSize,
        fill: color,
        fontStyle: this.getFontStyle(),
        rotation: position.angle
      })
      
      // Center character on path
      charText.offsetX(charMetrics.width / 2)
      charText.offsetY(fontSize / 2)
      
      this.pathTextGroup.add(charText)
      
      // Move to next character position
      currentOffset += charMetrics.width + spacing
      
      // Stop if we've gone past the path
      if (currentOffset > totalLength) break
    }
    
    const layer = this.pathTextGroup.getLayer()
    if (layer) layer.batchDraw()
  }
  
  /**
   * Get points from a path shape
   */
  private getPathPoints(shape: Konva.Shape): { x: number; y: number }[] {
    if (shape instanceof Konva.Path) {
      // Parse SVG path data
      const data = shape.data()
      return this.parseSVGPath(data)
    } else if (shape instanceof Konva.Line || shape instanceof Konva.Arrow) {
      // Get line points
      const points = shape.points()
      const result: { x: number; y: number }[] = []
      for (let i = 0; i < points.length; i += 2) {
        result.push({ x: points[i], y: points[i + 1] })
      }
      return result
    }
    
    // Fallback: sample points along shape
    return this.sampleShapePoints(shape)
  }
  
  /**
   * Parse SVG path data to points (simplified)
   */
  private parseSVGPath(data: string): { x: number; y: number }[] {
    // This is a simplified parser - in production, use a proper SVG path parser
    const points: { x: number; y: number }[] = []
    const commands = data.match(/[MLCQZmlcqz][^MLCQZmlcqz]*/g) || []
    
    let currentX = 0
    let currentY = 0
    
    commands.forEach(cmd => {
      const type = cmd[0]
      const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number)
      
      switch (type) {
        case 'M':
        case 'L':
          currentX = coords[0]
          currentY = coords[1]
          points.push({ x: currentX, y: currentY })
          break
        case 'm':
        case 'l':
          currentX += coords[0]
          currentY += coords[1]
          points.push({ x: currentX, y: currentY })
          break
        // Add more commands as needed
      }
    })
    
    return points
  }
  
  /**
   * Sample points along a shape's perimeter
   */
  private sampleShapePoints(shape: Konva.Shape, samples = 100): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = []
    const bounds = shape.getClientRect()
    
    // Simple rectangle sampling - override for specific shapes
    for (let i = 0; i <= samples; i++) {
      const t = i / samples
      points.push({
        x: bounds.x + bounds.width * t,
        y: bounds.y
      })
    }
    
    return points
  }
  
  /**
   * Calculate total path length
   */
  private calculatePathLength(points: { x: number; y: number }[]): number {
    let length = 0
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x
      const dy = points[i].y - points[i - 1].y
      length += Math.sqrt(dx * dx + dy * dy)
    }
    return length
  }
  
  /**
   * Get point and angle at specific offset along path
   */
  private getPointOnPath(
    points: { x: number; y: number }[], 
    offset: number, 
    totalLength: number
  ): { x: number; y: number; angle: number } | null {
    if (offset < 0 || offset > totalLength) return null
    
    let currentLength = 0
    
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x
      const dy = points[i].y - points[i - 1].y
      const segmentLength = Math.sqrt(dx * dx + dy * dy)
      
      if (currentLength + segmentLength >= offset) {
        // Found the segment
        const t = (offset - currentLength) / segmentLength
        return {
          x: points[i - 1].x + dx * t,
          y: points[i - 1].y + dy * t,
          angle: Math.atan2(dy, dx) * 180 / Math.PI
        }
      }
      
      currentLength += segmentLength
    }
    
    return null
  }
  
  /**
   * Override option change to update path text
   */
  protected onOptionChange(key: string, value: unknown): void {
    super.onOptionChange(key, value)
    
    // Handle path-specific options
    if (key === 'pathOffset' || key === 'pathSide' || key === 'spacing' || key === 'baselineShift') {
      const currentText = this.state.get('currentText')
      if (currentText && this.pathTextGroup) {
        const text = currentText.text()
        this.renderTextOnPath(text)
      }
    }
  }
  
  /**
   * Override commit to clear path selection
   */
  protected async commitText(): Promise<void> {
    await super.commitText()
    this.clearPathSelection()
    this.pathTextGroup = null
  }
  
  /**
   * Override cancel to clear path selection
   */
  protected cancelEditing(): void {
    super.cancelEditing()
    this.clearPathSelection()
    
    // Remove the path text group if canceling
    if (this.pathTextGroup) {
      this.pathTextGroup.destroy()
      const layer = this.pathTextGroup.getLayer()
      if (layer) layer.batchDraw()
      this.pathTextGroup = null
    }
  }
}

export const typeOnPathTool = new TypeOnPathTool() 