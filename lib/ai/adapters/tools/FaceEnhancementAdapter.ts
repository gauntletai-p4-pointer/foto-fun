import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { FaceEnhancementTool } from '@/lib/ai/tools/FaceEnhancementTool'

const inputSchema = z.object({
  modelTier: z.enum(['best', 'fast']).optional().describe('Quality tier: best for highest quality, fast for speed'),
  enhancementScale: z.number().min(1).max(4).optional().describe('Enhancement scale (1-4): higher values provide better quality but take longer'),
  autoDetect: z.boolean().optional().describe('Automatically detect and enhance all faces in the image')
})

type Input = z.output<typeof inputSchema>

interface Output {
  objectId: string
  facesEnhanced: number
  enhancementScale: number
}

/**
 * AI Adapter for Face Enhancement
 * Enhances faces in images using AI super-resolution
 */
export class FaceEnhancementAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'face-enhancement'
  aiName = 'enhanceFaces'
  description = 'Enhance faces in selected images using AI. Improves facial details, reduces blur, and increases resolution of faces while preserving natural appearance.'
  inputSchema = inputSchema
  
  private tool = new FaceEnhancementTool()
  
  async execute(params: Input, context: ObjectCanvasContext): Promise<Output> {
    // Validate input and apply defaults
    const validated = this.validateInput({
      modelTier: params.modelTier || 'best',
      enhancementScale: params.enhancementScale || 2,
      autoDetect: params.autoDetect ?? true,
      ...params
    })
    
    // Get image targets only
    const imageTargets = this.getImageTargets(context)
    if (imageTargets.length === 0) {
      throw new Error('No image objects found. Face enhancement requires at least one selected image.')
    }
    
    // Use the first image target
    const targetImage = imageTargets[0]
    
    try {
      // Set options on the tool
      this.tool.setOption('enhancementScale', validated.enhancementScale)
      this.tool.setOption('autoDetect', validated.autoDetect)
      
      // Execute face enhancement using the tool's main method
      await this.tool.enhanceFace(targetImage)
      
      // The tool modifies the object in place, so we return the same ID
      return {
        objectId: targetImage.id,
        facesEnhanced: 1, // Placeholder - actual implementation would detect face count
        enhancementScale: validated.enhancementScale || 2
      }
      
    } catch (error) {
      throw new Error(`Face enhancement failed: ${this.formatError(error)}`)
    }
  }
}