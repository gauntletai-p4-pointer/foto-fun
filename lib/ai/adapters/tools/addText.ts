import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { horizontalTypeTool } from '@/lib/editor/tools/text'
import { Canvas, IText } from 'fabric'
import { AddTextCommand } from '@/lib/editor/commands/text'
import { useHistoryStore } from '@/store/historyStore'

// Define input schema for text parameters
const addTextInputSchema = z.object({
  text: z.string().min(1).describe('The text content to add'),
  position: z.enum(['top', 'center', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).optional().describe('Position of the text on the canvas (default: center)'),
  fontSize: z.number().min(8).max(144).optional().describe('Font size in points (default: 60)'),
  fontFamily: z.string().optional().describe('Font family (default: Arial)'),
  color: z.string().optional().describe('Text color in hex format (default: #000000)'),
  style: z.enum(['normal', 'title', 'subtitle', 'caption', 'watermark']).optional().describe('Predefined text style')
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
  description = `Add text overlays to existing images on the canvas. You MUST determine text properties based on user intent.

Common text requests:
- "add text 'Hello'" → text: "Hello", default styling
- "add title 'Welcome'" → text: "Welcome", style: "title"
- "add watermark" → style: "watermark", appropriate positioning
- "add caption" → style: "caption", position: "bottom"

NEVER ask for exact styling - interpret the user's intent and choose appropriate defaults.`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

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
      // Calculate position based on position enum
      const canvasWidth = canvas.getWidth()
      const canvasHeight = canvas.getHeight()
      const margin = 50 // Default margin from edges
      
      let x = canvasWidth / 2
      let y = canvasHeight / 2
      
      switch (params.position) {
        case 'top':
          y = margin + 30
          break
        case 'bottom':
          y = canvasHeight - margin - 30
          break
        case 'top-left':
          x = margin + 100
          y = margin + 30
          break
        case 'top-right':
          x = canvasWidth - margin - 100
          y = margin + 30
          break
        case 'bottom-left':
          x = margin + 100
          y = canvasHeight - margin - 30
          break
        case 'bottom-right':
          x = canvasWidth - margin - 100
          y = canvasHeight - margin - 30
          break
        case 'center':
        default:
          // Already set to center
          break
      }
      
      // Apply style presets
      let fontSize = params.fontSize || 60
      let fontWeight = 'normal' as 'normal' | 'bold'
      const fontStyle = 'normal' as 'normal' | 'italic'
      
      switch (params.style) {
        case 'title':
          fontSize = params.fontSize || 72
          fontWeight = 'bold'
          break
        case 'subtitle':
          fontSize = params.fontSize || 48
          break
        case 'caption':
          fontSize = params.fontSize || 24
          break
        case 'watermark':
          fontSize = params.fontSize || 36
          break
      }
      
      // Create text object with parameters
      const text = new IText(params.text, {
        left: x,
        top: y,
        fontSize,
        fontFamily: params.fontFamily || 'Arial',
        fill: params.color || '#000000',
        textAlign: 'center',
        fontWeight,
        fontStyle,
        originX: 'center',
        originY: 'center',
        splitByGrapheme: true // Support emojis
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