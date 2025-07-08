import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { horizontalTypeTool } from '@/lib/editor/tools/text'
import { Canvas, IText } from 'fabric'
import { AddTextCommand } from '@/lib/editor/commands/text'
import { useHistoryStore } from '@/store/historyStore'

// Define input schema for text parameters
const addTextInputSchema = z.object({
  text: z.string().describe('The text content to add'),
  x: z.number().optional().describe('X position in pixels (default: center)'),
  y: z.number().optional().describe('Y position in pixels (default: center)'),
  fontSize: z.number().min(8).max(144).optional().describe('Font size in points (default: 24)'),
  fontFamily: z.string().optional().describe('Font family name (default: Arial)'),
  color: z.string().optional().describe('Text color in hex format (default: #000000)'),
  alignment: z.enum(['left', 'center', 'right', 'justify']).optional().describe('Text alignment (default: left)'),
  bold: z.boolean().optional().describe('Whether text should be bold (default: false)'),
  italic: z.boolean().optional().describe('Whether text should be italic (default: false)'),
  underline: z.boolean().optional().describe('Whether text should be underlined (default: false)')
})

type AddTextInput = z.infer<typeof addTextInputSchema>

interface AddTextOutput {
  success: boolean
  message?: string
  textId?: string
  bounds?: {
    left: number
    top: number
    width: number
    height: number
  }
}

/**
 * AI adapter for adding text to the canvas
 * Allows natural language text placement and styling
 */
export class AddTextToolAdapter extends BaseToolAdapter<AddTextInput, AddTextOutput> {
  tool = horizontalTypeTool
  aiName = 'addText'
  description = `Add text to the image at specified position with styling. You MUST calculate positions based on user intent.
Common patterns you should use:
- "add text at top" → y: 50-100 pixels from top
- "add text at bottom" → y: canvas.height - 100 pixels
- "add text in center" → x: canvas.width/2, y: canvas.height/2
- "add text on the left" → x: 50-100 pixels from left
- "add text on the right" → x: canvas.width - 200 pixels
- "add title" → fontSize: 36-48, bold: true
- "add caption" → fontSize: 14-18, bottom position
- "add watermark" → fontSize: 24-36, opacity consideration
- "heading style" → fontSize: 32-48, bold: true
- "body text" → fontSize: 16-20
- Natural colors: "red text" → #FF0000, "blue text" → #0000FF, etc.
NEVER ask for exact positions - interpret the user's intent and calculate appropriate coordinates.`
  
  inputSchema = addTextInputSchema
  
  async execute(params: AddTextInput, context: { canvas: Canvas }): Promise<AddTextOutput> {
    const { canvas } = context
    
    if (!canvas) {
      return {
        success: false,
        message: 'Canvas is required but not provided'
      }
    }
    
    try {
      // Calculate position if not provided
      const canvasWidth = canvas.getWidth()
      const canvasHeight = canvas.getHeight()
      
      const x = params.x ?? canvasWidth / 2
      const y = params.y ?? canvasHeight / 2
      
      // Create text object with parameters
      const text = new IText(params.text, {
        left: x,
        top: y,
        fontSize: params.fontSize || 24,
        fontFamily: params.fontFamily || 'Arial',
        fill: params.color || '#000000',
        textAlign: params.alignment || 'left',
        fontWeight: params.bold ? 'bold' : 'normal',
        fontStyle: params.italic ? 'italic' : 'normal',
        underline: params.underline || false,
        originX: 'center',
        originY: 'center',
      })
      
      // Generate unique ID for the text
      const textId = `text-${Date.now()}`
      text.set('id' as keyof IText, textId as IText[keyof IText])
      
      // Add to canvas using command pattern for undo/redo
      const command = new AddTextCommand(canvas, text)
      await useHistoryStore.getState().executeCommand(command)
      
      // Get bounds after adding to canvas
      const bounds = text.getBoundingRect()
      
      return {
        success: true,
        message: `Added text "${params.text}" to the canvas`,
        textId,
        bounds: {
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add text'
      }
    }
  }
  
  /**
   * Check if text can be added (canvas must be ready)
   */
  canExecute(canvas: Canvas): boolean {
    return !!canvas && canvas.getObjects().length >= 0
  }
  
  /**
   * Generate preview of text placement
   */
  async generatePreview(params: AddTextInput, canvas: Canvas): Promise<{ before: string; after: string }> {
    // For now, return current state as both before and after
    // A full implementation would create a temporary canvas for preview
    const before = canvas.toDataURL()
    const after = before // Simplified for now
    
    return { before, after }
  }
}

// Export singleton instance
export const addTextAdapter = new AddTextToolAdapter() 