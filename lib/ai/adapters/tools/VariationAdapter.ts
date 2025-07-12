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
    
    try {
      // Execute variation generation - tool should create and return canvas objects
      const variations = await this.tool.execute(targetImage, {
        strength: validated.variationStrength,
        numVariations: validated.count
        // Note: seed and modelTier are not supported by VariationTool interface
      })
      
      // Tool should have created the canvas objects, just return their IDs
      const objectIds = variations.map(variation => variation.id)
      
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