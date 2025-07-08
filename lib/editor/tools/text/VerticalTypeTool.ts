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
  shortcut = 'T' // Same as horizontal, toggle between them
  
  /**
   * Create a vertical text object
   */
  protected createTextObject(x: number, y: number): IText {
    const fontFamily = this.getOptionValue<string>('fontFamily') || 'Arial'
    const fontSize = this.getOptionValue<number>('fontSize') || 24
    const color = this.getOptionValue<string>('color') || '#000000'
    const alignment = this.getOptionValue<string>('alignment') || 'left'
    const bold = this.getOptionValue<boolean>('bold') || false
    const italic = this.getOptionValue<boolean>('italic') || false
    const underline = this.getOptionValue<boolean>('underline') || false
    
    // Create IText object with vertical properties
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
      cursorDelay: 500,
      cursorDuration: 500,
      selectionColor: 'rgba(100, 100, 255, 0.3)',
      selectionStart: 0,
      selectionEnd: 0,
      evented: true,
      // Vertical text specific properties
      direction: 'rtl', // Right to left for vertical
      splitByGrapheme: true, // Important for Asian characters
    })
    
    // Rotate for vertical orientation
    text.angle = 90
    
    // Adjust origin for better positioning
    text.originX = 'center'
    text.originY = 'center'
    
    return text
  }
}

// Export singleton instance
export const verticalTypeTool = new VerticalTypeTool() 