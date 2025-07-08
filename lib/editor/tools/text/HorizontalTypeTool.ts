import { Type } from 'lucide-react'
import { IText } from 'fabric'
import { TOOL_IDS } from '@/constants'
import { BaseTextTool } from '../base/BaseTextTool'

/**
 * Horizontal Type Tool - Standard text tool for horizontal text
 * Creates and edits horizontal text objects
 */
class HorizontalTypeTool extends BaseTextTool {
  // Tool identification
  id = TOOL_IDS.TYPE_HORIZONTAL
  name = 'Horizontal Type Tool'
  icon = Type
  cursor = 'text'
  shortcut = 'T'
  
  /**
   * Create a horizontal text object
   */
  protected createTextObject(x: number, y: number): IText {
    const fontFamily = this.getOptionValue<string>('fontFamily') || 'Arial'
    const fontSize = this.getOptionValue<number>('fontSize') || 24
    const color = this.getOptionValue<string>('color') || '#000000'
    const alignment = this.getOptionValue<string>('alignment') || 'left'
    const bold = this.getOptionValue<boolean>('bold') || false
    const italic = this.getOptionValue<boolean>('italic') || false
    const underline = this.getOptionValue<boolean>('underline') || false
    
    // Create IText object with initial properties
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
      evented: true
    })
    
    return text
  }
}

// Export singleton instance
export const horizontalTypeTool = new HorizontalTypeTool() 