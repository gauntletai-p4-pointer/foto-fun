import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { VariationTool } from '@/lib/ai/tools/VariationTool'

const inputSchema = z.object({
  variationStrength: z.number().min(0.1).max(1.0).default(0.7).describe('How different the variations should be (0.1 = very similar, 1.0 = very different)'),
  count: z.number().min(1).max(4).default(2).describe('Number of variations to generate'),
  seed: z.number().optional().describe('Random seed for reproducible results'),
  modelTier: z.enum(['best', 'fast']).default('best').describe('Quality tier: best for highest quality, fast for speed')
})

type Input = z.output<typeof inputSchema>

interface Output {
  objectIds: string[]
  variationCount: number
  strength: number
}

/**
 * AI Adapter for Image Variations
 * Generates multiple variations of existing images
 */
export class VariationAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'ai-variation'
  aiName = 'generateVariations'
  description = 'Generate multiple AI variations of selected images. Creates new images with similar content but different styles, compositions, or details.'
  inputSchema = inputSchema
  
  private tool = new VariationTool()
  
  async execute(params: Input, context: ObjectCanvasContext): Promise<Output> {
    // Validate input
    const validated = this.validateInput(params)
    
    // Get image targets only
    const imageTargets = this.getImageTargets(context)
    if (imageTargets.length === 0) {
      throw new Error('No image objects found. Variation generation requires at least one selected image.')
    }
    
    // Use the first image target
    const targetImage = imageTargets[0]
    const objectIds: string[] = []
    
    try {
      // Generate variations
      const variations = await this.tool.execute(targetImage, {
        strength: validated.variationStrength,
        numVariations: validated.count
      })
      
      // Add each variation to canvas
      for (let i = 0; i < variations.length; i++) {
        const variation = variations[i]
        const offsetX = (i % 2) * (targetImage.width + 40)
        const offsetY = Math.floor(i / 2) * (targetImage.height + 40)
        
        const objectId = await context.canvas.addObject({
          type: 'image',
          x: targetImage.x + offsetX + 40,
          y: targetImage.y + offsetY + 40,
          width: targetImage.width,
          height: targetImage.height,
          scaleX: targetImage.scaleX || 1,
          scaleY: targetImage.scaleY || 1,
          data: variation.data,
          metadata: {
            source: 'ai-variation',
            originalObjectId: targetImage.id,
            variationIndex: i + 1,
            variationStrength: validated.variationStrength,
            seed: validated.seed,
            modelTier: validated.modelTier,
            processedAt: new Date().toISOString()
          }
        })
        
        objectIds.push(objectId)
      }
      
      // Select all new variation objects
      context.canvas.selectMultiple(objectIds)
      
      return {
        objectIds,
        variationCount: variations.length,
        strength: validated.variationStrength
      }
      
    } catch (error) {
      throw new Error(`Variation generation failed: ${this.formatError(error)}`)
    }
  }
}