import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import type { TextData } from '@/lib/editor/objects/types'

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
  message: string
  textId: string
  bounds: {
    left: number
    top: number
    width: number
    height: number
  }
  affectedObjects: string[]
}

/**
 * AI adapter for adding text to the canvas
 * Allows natural language text placement and styling
 */
export class AddTextToolAdapter extends UnifiedToolAdapter<AddTextInput, AddTextOutput> {
  toolId = 'text'
  aiName = 'addText'
  description = `Add text overlays to the canvas. You MUST determine text properties based on user intent.

Common text requests:
- "add text 'Hello'" → text: "Hello", default styling
- "add title 'Welcome'" → text: "Welcome", style: "title"
- "add watermark" → style: "watermark", appropriate positioning
- "add caption" → style: "caption", position: "bottom"

NEVER ask for exact styling - interpret the user's intent and choose appropriate defaults.`

  inputSchema = addTextInputSchema
  
  async execute(params: AddTextInput, context: ObjectCanvasContext): Promise<AddTextOutput> {
    const canvas = context.canvas
    
    // Calculate position based on position enum
    const viewport = canvas.getViewport()
    const margin = 50 // Default margin from edges
    
    // Start with center
    let x = viewport.width / 2
    let y = viewport.height / 2
    
    switch (params.position) {
      case 'top':
        y = margin + 30
        break
      case 'bottom':
        y = viewport.height - margin - 30
        break
      case 'top-left':
        x = margin + 100
        y = margin + 30
        break
      case 'top-right':
        x = viewport.width - margin - 100
        y = margin + 30
        break
      case 'bottom-left':
        x = margin + 100
        y = viewport.height - margin - 30
        break
      case 'bottom-right':
        x = viewport.width - margin - 100
        y = viewport.height - margin - 30
        break
      case 'center':
      default:
        // Already set to center
        break
    }
    
    // Apply style presets
    let fontSize = params.fontSize || 60
    let _fontWeight = 'normal'
    
    switch (params.style) {
      case 'title':
        fontSize = params.fontSize || 72
        _fontWeight = 'bold'
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
    
    // Calculate approximate text dimensions
    const textWidth = params.text.length * fontSize * 0.6
    const textHeight = fontSize * 1.2
    
    // Create text data
    const textData: TextData = {
      content: params.text,
      font: params.fontFamily || 'Arial',
      fontSize,
      color: params.color || '#000000',
      align: 'center',
      lineHeight: 1.2
    }
    
    // Create text object
    const textId = await canvas.addObject({
      type: 'text',
      name: `Text: ${params.text.substring(0, 20)}...`,
      x: x - textWidth / 2, // Adjust for center alignment
      y: y - textHeight / 2,
      width: textWidth,
      height: textHeight,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: params.style === 'watermark' ? 0.5 : 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      zIndex: canvas.getAllObjects().length,
      filters: [],
      adjustments: [],
      data: textData
    })
    
    // Select the new text
    canvas.selectObject(textId)
    
    return {
      success: true,
      message: `Added text "${params.text}" to the canvas`,
      textId,
      bounds: {
        left: x - textWidth / 2,
        top: y - textHeight / 2,
        width: textWidth,
        height: textHeight
      },
      affectedObjects: [textId]
    }
  }
} 