import { z } from 'zod'
import { CanvasToolAdapter } from '../base'
import { horizontalTypeTool } from '@/lib/editor/tools/text'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'

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
  targetingMode: 'selection' | 'auto-single' | 'all' | 'none'
}

/**
 * AI adapter for adding text to the canvas
 * Allows natural language text placement and styling
 */
export class AddTextToolAdapter extends CanvasToolAdapter<AddTextInput, AddTextOutput> {
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
  
  protected getActionVerb(): string {
    return 'add text'
  }
  
  async execute(params: AddTextInput, context: CanvasContext, executionContext?: ExecutionContext): Promise<AddTextOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async () => {
        const canvas = context.canvas
        
        // Calculate position based on position enum
        const canvasWidth = canvas.state.width
        const canvasHeight = canvas.state.height
        const margin = 50 // Default margin from edges
        
        // Start with center
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
        let fontWeight = 'normal'
        
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
        
        // Create text object using CanvasManager
        const textObject = await canvas.addObject({
          type: 'text',
          data: params.text,
          transform: {
            x,
            y,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            skewX: 0,
            skewY: 0
          },
          style: {
            fontSize,
            fontFamily: params.fontFamily || 'Arial',
            fill: params.color || '#000000',
            fontWeight,
            textAlign: 'center'
          },
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal'
        })
        
        return {
          message: `Added text "${params.text}" to the canvas`,
          textId: textObject.id,
          bounds: {
            left: x - 100, // Approximate bounds
            top: y - fontSize / 2,
            width: 200,
            height: fontSize
          }
        }
      },
      executionContext
    )
  }
  
  /**
   * Check if text can be added (canvas must be ready)
   */
  canExecute(canvas: CanvasManager): boolean {
    return !!canvas && canvas.state.layers.length > 0
  }
}

// Export singleton instance
export const addTextAdapter = new AddTextToolAdapter() 