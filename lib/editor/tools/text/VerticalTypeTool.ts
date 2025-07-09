import { Type } from 'lucide-react'
import { IText } from 'fabric'
import { TOOL_IDS } from '@/constants'
import { BaseTextTool } from '../base/BaseTextTool'

/**
 * Vertical Type Tool - Creates vertical text for Asian typography and design
 * Text flows from top to bottom
 */
class VerticalTypeTool extends BaseTextTool {
  // Tool identification
  id = TOOL_IDS.TYPE_VERTICAL
  name = 'Vertical Type Tool'
  icon = Type
  cursor = 'text'
  shortcut = undefined // Access via tool palette or tool cycling
  
  /**
   * Create a vertical text object
   */
  protected createTextObject(x: number, y: number): IText {
    const fontFamily = this.getOptionValue<string>('fontFamily') || 'Arial'
    const fontSize = this.getOptionValue<number>('fontSize') || 60
    const color = this.getOptionValue<string>('color') || '#000000'
    const alignment = this.getOptionValue<string>('alignment') || 'left'
    const bold = this.getOptionValue<boolean>('bold') || false
    const italic = this.getOptionValue<boolean>('italic') || false
    const underline = this.getOptionValue<boolean>('underline') || false
    
    // Create IText object with vertical orientation
    const text = new IText(' ', {
      left: x,
      top: y,
      fontFamily,
      fontSize,
      fill: color,
      textAlign: alignment,
      fontWeight: bold ? 'bold' : 'normal',
      fontStyle: italic ? 'italic' : 'normal',
      underline,
      angle: -90, // Rotate 90 degrees counter-clockwise for vertical text
      originX: 'left',
      originY: 'top',
      editable: true,
      cursorColor: color, // Match cursor color to text color
      cursorWidth: 2,
      cursorDelay: 500,
      cursorDuration: 500,
      selectionColor: 'rgba(100, 100, 255, 0.3)',
      selectionStart: 0,
      selectionEnd: 1, // Select the placeholder space
      evented: true
    })
    
    return text
  }
}

// Export singleton instance
export const verticalTypeTool = new VerticalTypeTool() 