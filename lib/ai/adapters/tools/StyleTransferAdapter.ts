import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { CanvasContext } from '@/lib/ai/canvas/CanvasContext'
import { StyleTransferTool } from '@/lib/ai/tools/StyleTransferTool'

const inputSchema = z.object({
  stylePrompt: z.string().describe('Description of the artistic style to apply (e.g., "oil painting", "watercolor", "Van Gogh style")'),
  strength: z.number().min(0.1).max(1.0).default(0.8).describe('Strength of style transfer (0.1 = subtle, 1.0 = strong)'),
  preserveColors: z.boolean().default(false).describe('Whether to preserve original colors while applying style'),
  modelTier: z.enum(['best', 'artistic']).default('best').describe('Quality tier: best for highest quality, artistic for creative styles')
})

type Input = z.output<typeof inputSchema>

interface Output {
  objectId: string
  appliedStyle: string
  strength: number
}

/**
 * AI Adapter for Style Transfer
 * Applies artistic styles to images using AI
 */
export class StyleTransferAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'ai-style-transfer'
  aiName = 'applyStyle'
  description = 'Apply artistic styles to selected images. Transform photos into paintings, sketches, or other artistic styles using AI.'
  inputSchema = inputSchema
  
  private tool = new StyleTransferTool()
  
  async execute(params: Input, context: CanvasContext): Promise<Output> {
    // Validate input
    const validated = this.validateInput(params)
    
    // Get image targets only
    const imageTargets = this.getImageTargets(context)
    if (imageTargets.length === 0) {
      throw new Error('No image objects found. Style transfer requires at least one selected image.')
    }
    
    // Use the first image target
    const targetImage = imageTargets[0]
    
    try {
      // Execute style transfer
      const resultObject = await this.tool.execute(targetImage, {
        prompt: validated.stylePrompt,
        strength: validated.strength,
        modelTier: validated.modelTier
      })
      
      // Add the result object to canvas
      const objectId = await context.canvas.addObject({
        type: 'image',
        x: targetImage.x + 20, // Offset slightly
        y: targetImage.y + 20,
        width: targetImage.width,
        height: targetImage.height,
        scaleX: targetImage.scaleX || 1,
        scaleY: targetImage.scaleY || 1,
        data: resultObject.data,
        metadata: {
          source: 'ai-style-transfer',
          originalObjectId: targetImage.id,
          stylePrompt: validated.stylePrompt,
          strength: validated.strength,
          preserveColors: validated.preserveColors,
          modelTier: validated.modelTier,
          processedAt: new Date().toISOString()
        }
      })
      
      // Select the new object
      context.canvas.selectObject(objectId)
      
      return {
        objectId,
        appliedStyle: validated.stylePrompt,
        strength: validated.strength
      }
      
    } catch (error) {
      throw new Error(`Style transfer failed: ${this.formatError(error)}`)
    }
  }
}