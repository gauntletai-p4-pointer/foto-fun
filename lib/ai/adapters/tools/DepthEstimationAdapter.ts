import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { DepthEstimationTool } from '@/lib/ai/tools/RelightingTool'

const inputSchema = z.object({
  outputFormat: z.enum(['grayscale', 'colored']).default('grayscale').describe('Output format for the depth map: grayscale for standard depth maps, colored for visualization')
})

type Input = z.output<typeof inputSchema>

interface Output {
  objectId: string
  outputFormat: 'grayscale' | 'colored'
}

/**
 * AI Adapter for Depth Estimation
 * Generates depth maps from images using AI
 */
export class DepthEstimationAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'ai-depth-estimation'
  aiName = 'estimateDepth'
  description = 'Generate a depth map from selected images using AI. Creates a new image object showing depth information where darker areas are closer and lighter areas are farther away.'
  inputSchema = inputSchema
  
  private tool = new DepthEstimationTool()
  
  async execute(params: Input, context: ObjectCanvasContext): Promise<Output> {
    // Validate input and apply defaults
    const validated = this.validateInput(params)
    
    // Get image targets only
    const imageTargets = this.getImageTargets(context)
    if (imageTargets.length === 0) {
      throw new Error('No image objects found. Depth estimation requires at least one selected image.')
    }
    
    // Use the first image target
    const targetImage = imageTargets[0]
    
    try {
      // Execute depth estimation
      const resultObject = await this.tool.execute(targetImage, {
        outputFormat: validated.outputFormat || 'grayscale'
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
          source: 'ai-depth-estimation',
          originalObjectId: targetImage.id,
          outputFormat: validated.outputFormat || 'grayscale',
          processedAt: new Date().toISOString()
        }
      })
      
      // Select the new object
      context.canvas.selectObject(objectId)
      
      return {
        objectId,
        outputFormat: validated.outputFormat || 'grayscale'
      }
      
    } catch (error) {
      throw new Error(`Depth estimation failed: ${this.formatError(error)}`)
    }
  }
}