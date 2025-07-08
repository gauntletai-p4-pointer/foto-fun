import { Type } from 'lucide-react'
import { IText, Path, util, Canvas } from 'fabric'
import { TOOL_IDS } from '@/constants'
import { BaseTextTool } from '../base/BaseTextTool'
import type { TPointerEventInfo } from 'fabric'

/**
 * Type on Path Tool - Allows text to follow the curve of a path
 * Click on any path object to add text that follows its curve
 */
class TypeOnPathTool extends BaseTextTool {
  // Tool identification
  id = TOOL_IDS.TYPE_ON_PATH
  name = 'Type on a Path Tool'
  icon = Type
  cursor = 'text'
  shortcut = 'T' // Same shortcut group as other text tools
  
  // Track the selected path
  private selectedPath: Path | null = null
  private pathHoverTimeout: NodeJS.Timeout | null = null
  
  /**
   * Override setup to add path detection
   */
  protected setupTool(canvas: Canvas): void {
    super.setupTool(canvas)
    
    // Add path hover detection
    this.addCanvasEvent('mouse:move', (e: unknown) => this.handleMouseMove(e as TPointerEventInfo<MouseEvent>))
    this.addCanvasEvent('mouse:out', () => this.handleMouseOut())
  }
  
  /**
   * Override cleanup to clear path selection
   */
  protected cleanup(canvas: Canvas): void {
    super.cleanup(canvas)
    
    this.clearPathSelection()
    if (this.pathHoverTimeout) {
      clearTimeout(this.pathHoverTimeout)
      this.pathHoverTimeout = null
    }
  }
  
  /**
   * Handle mouse movement to detect paths
   */
  private handleMouseMove(e: TPointerEventInfo<MouseEvent>): void {
    if (!this.canvas || this.state.get('isEditing')) return
    
    const target = this.canvas.findTarget(e.e)
    
    if (target && target instanceof Path) {
      // Highlight the path
      if (this.selectedPath !== target) {
        this.clearPathSelection()
        this.selectedPath = target
        
        // Store original properties
        this.selectedPath.set('data', {
          ...this.selectedPath.get('data'),
          originalStroke: this.selectedPath.stroke,
          originalStrokeWidth: this.selectedPath.strokeWidth
        })
        
        // Highlight the path
        this.selectedPath.set({
          stroke: '#0066ff',
          strokeWidth: 2
        })
        
        this.canvas.renderAll()
      }
      
      // Update cursor
      this.canvas.defaultCursor = 'text'
    } else {
      // Clear selection if not hovering over a path
      if (this.pathHoverTimeout) {
        clearTimeout(this.pathHoverTimeout)
      }
      
      this.pathHoverTimeout = setTimeout(() => {
        this.clearPathSelection()
        this.canvas!.defaultCursor = this.cursor
      }, 100)
    }
  }
  
  /**
   * Handle mouse leaving canvas
   */
  private handleMouseOut(): void {
    this.clearPathSelection()
  }
  
  /**
   * Clear path selection and restore original properties
   */
  private clearPathSelection(): void {
    if (this.selectedPath && this.canvas) {
      const data = this.selectedPath.get('data')
      if (data?.originalStroke !== undefined) {
        this.selectedPath.set({
          stroke: data.originalStroke,
          strokeWidth: data.originalStrokeWidth || 1
        })
      }
      
      this.canvas.renderAll()
      this.selectedPath = null
    }
  }
  
  /**
   * Override mouse down to handle path selection
   */
  protected handleMouseDown(e: TPointerEventInfo<MouseEvent>): void {
    if (!this.canvas) return
    
    const target = this.canvas.findTarget(e.e)
    
    // If clicking on a path, create text on that path
    if (target && target instanceof Path && !this.state.get('isEditing')) {
      this.selectedPath = target
      const pointer = this.canvas.getPointer(e.e)
      this.createNewText(pointer.x, pointer.y)
      return
    }
    
    // Otherwise use default behavior
    super.handleMouseDown(e)
  }
  
  /**
   * Create text that follows a path
   */
  protected createTextObject(x: number, y: number): IText {
    // Get text options
    const fontFamily = this.getOptionValue<string>('fontFamily') || 'Arial'
    const fontSize = this.getOptionValue<number>('fontSize') || 24
    const color = this.getOptionValue<string>('color') || '#000000'
    const alignment = this.getOptionValue<string>('alignment') || 'left'
    const bold = this.getOptionValue<boolean>('bold') || false
    const italic = this.getOptionValue<boolean>('italic') || false
    const underline = this.getOptionValue<boolean>('underline') || false
    
    if (this.selectedPath) {
      // Create text that will follow the path
      const text = new IText('', {
        left: x,
        top: y,
        fontFamily,
        fontSize,
        fill: color,
        textAlign: alignment,
        fontWeight: bold ? 'bold' : 'normal',
        fontStyle: italic ? 'italic' : 'normal',
        underline,
        editable: true,
        cursorColor: '#000000',
        cursorWidth: 2,
        // Store reference to the path
        data: {
          pathId: this.selectedPath.get('id' as keyof Path),
          pathObject: this.selectedPath,
          isPathText: true
        }
      })
      
      // Set up text-on-path behavior
      this.setupTextOnPath(text, this.selectedPath)
      
      return text
    } else {
      // Create regular text if no path selected
      return new IText('', {
        left: x,
        top: y,
        fontFamily,
        fontSize,
        fill: color,
        textAlign: alignment,
        fontWeight: bold ? 'bold' : 'normal',
        fontStyle: italic ? 'italic' : 'normal',
        underline,
        editable: true,
        cursorColor: '#000000',
        cursorWidth: 2
      })
    }
  }
  
  /**
   * Set up text to follow a path
   */
  private setupTextOnPath(text: IText, path: Path): void {
    // Store the path reference
    const textWithPath = text as IText & { 
      path?: Path
      pathOffset?: number
      updateTextPath?: () => void
    }
    
    textWithPath.path = path
    textWithPath.pathOffset = 0
    
    // Override the render method to draw text along path
    const originalRender = text._render.bind(text)
    
    text._render = function(ctx: CanvasRenderingContext2D) {
      if (!textWithPath.path || !text.text) {
        // Render normally if no path or text
        originalRender(ctx)
        return
      }
      
      ctx.save()
      
      // Get path length and points
      const pathInfo = util.getPathSegmentsInfo(textWithPath.path.path)
      const pathLength = pathInfo[pathInfo.length - 1]?.length || 0
      
      if (pathLength === 0) {
        originalRender(ctx)
        ctx.restore()
        return
      }
      
      // Draw each character along the path
      const chars = text.text.split('')
      const charSpacing = 2 // Additional spacing between characters
      let currentOffset = textWithPath.pathOffset || 0
      
      // Set text properties
      ctx.font = `${text.fontStyle} ${text.fontWeight} ${text.fontSize}px ${text.fontFamily}`
      ctx.fillStyle = text.fill as string
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      chars.forEach((char) => {
        if (currentOffset > pathLength) return
        
        // Get point on path at current offset
        const point = util.getPointOnPath(textWithPath.path!.path, currentOffset)
        
        if (point) {
          ctx.save()
          
          // Translate to point and rotate to follow path
          ctx.translate(point.x, point.y)
          ctx.rotate(point.angle)
          
          // Draw character
          ctx.fillText(char, 0, 0)
          
          ctx.restore()
        }
        
        // Move to next character position
        const charWidth = ctx.measureText(char).width
        currentOffset += charWidth + charSpacing
      })
      
      ctx.restore()
    }
    
    // Update text path when text changes
    textWithPath.updateTextPath = () => {
      text.dirty = true
      text.canvas?.renderAll()
    }
    
    // Listen for text changes
    text.on('changed', () => {
      textWithPath.updateTextPath?.()
    })
  }
  
  /**
   * Override commit to handle path text cleanup
   */
  protected commitText(): void {
    // Clear path selection when committing
    this.clearPathSelection()
    
    super.commitText()
  }
}

// Export singleton instance
export const typeOnPathTool = new TypeOnPathTool() 