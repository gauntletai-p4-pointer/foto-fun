import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { UpscalingTool } from '@/lib/ai/tools/UpscalingTool'

const inputSchema = z.object({
  scaleFactor: z.number().min(2).max(8).default(4).describe('How much to scale the image (2x, 4x, or 8x)'),
  enhanceDetails: z.boolean().default(true).describe('Whether to enhance fine details during upscaling'),
  preserveSharpness: z.boolean().default(true).describe('Whether to preserve edge sharpness'),
  modelTier: z.enum(['best', 'fast']).default('best').describe('Quality tier: best for highest quality, fast for speed')
})

type Input = z.output<typeof inputSchema>

interface Output {
  objectId: string
  originalDimensions: { width: number; height: number }
  newDimensions: { width: number; height: number }
  scaleFactor: number
}

/**
 * AI Adapter for Image Upscaling
 * Increases image resolution using AI super-resolution
 */
export class UpscalingAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'ai-upscaling'
  aiName = 'upscaleImage'
  description = 'Increase image resolution using AI super-resolution. Makes images larger while enhancing details and preserving quality.'
  inputSchema = inputSchema
  
  private tool = new UpscalingTool()
  
  async execute(params: Input, context: ObjectCanvasContext): Promise<Output> {
    // Validate input
    const validated = this.validateInput(params)
    
    // Get image targets only
    const imageTargets = this.getImageTargets(context)
    if (imageTargets.length === 0) {
      throw new Error('No image objects found. Upscaling requires at least one selected image.')
    }
    
    // Use the first image target
    const targetImage = imageTargets[0]
    const imageData = targetImage.data as import('@/lib/editor/objects/types').ImageData
    
    try {
      // Store original dimensions
      const originalDimensions = {
        width: imageData.naturalWidth,
        height: imageData.naturalHeight
      }
      
      // Execute upscaling - tool creates and returns the canvas object
      const resultObject = await this.tool.execute(targetImage, {
        scale: validated.scaleFactor as 2 | 4,
        faceEnhance: validated.enhanceDetails,
        modelTier: validated.modelTier
      })
      
      const resultImageData = resultObject.data as import('@/lib/editor/objects/types').ImageData
      const newDimensions = {
        width: resultImageData.naturalWidth,
        height: resultImageData.naturalHeight
      }
      
      // Tool already created the canvas object, just return its info
      return {
        objectId: resultObject.id,
        originalDimensions,
        newDimensions,
        scaleFactor: validated.scaleFactor
      }
      
    } catch (error) {
      throw new Error(`Upscaling failed: ${this.formatError(error)}`)
    }
  }
}