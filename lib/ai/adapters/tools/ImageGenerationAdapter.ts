import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { ReplicateService } from '@/lib/ai/services/replicate'

const inputSchema = z.object({
  prompt: z.string().describe('Text description of the image to generate'),
  width: z.number().min(512).max(2048).optional().default(1024),
  height: z.number().min(512).max(2048).optional().default(1024),
  negativePrompt: z.string().optional().default(''),
  position: z.object({
    x: z.number().optional(),
    y: z.number().optional()
  }).optional()
})

type Input = z.infer<typeof inputSchema>

interface Output {
  objectId: string
  dimensions: {
    width: number
    height: number
  }
}

/**
 * AI Adapter for Image Generation
 * Creates new image objects from text prompts
 */
export class ImageGenerationAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'image-generation'
  aiName = 'generateImage'
  description = 'Generate an AI image from a text prompt. Creates a new image object on the canvas.'
  inputSchema = inputSchema
  
  private replicateService: ReplicateService | null = null
  
  constructor() {
    super()
    
    // Initialize Replicate service
    const apiKey = process.env.NEXT_PUBLIC_REPLICATE_API_KEY
    if (apiKey) {
      this.replicateService = new ReplicateService(apiKey)
    }
  }
  
  async execute(params: Input, context: ObjectCanvasContext): Promise<Output> {
    if (!this.replicateService) {
      throw new Error('Replicate service not configured. Please set NEXT_PUBLIC_REPLICATE_API_KEY.')
    }
    
    // Validate input
    const validated = this.validateInput(params)
    
    try {
      // Generate the image
      const imageData = await this.replicateService.generateImage(validated.prompt, {
        width: validated.width,
        height: validated.height,
        negative_prompt: validated.negativePrompt
      })
      
      // Determine position
      let x: number, y: number
      if (validated.position?.x !== undefined && validated.position?.y !== undefined) {
        x = validated.position.x
        y = validated.position.y
      } else {
        // Center in viewport
        // @ts-expect-error - getViewportBounds exists
        const viewport = context.canvas.getViewportBounds()
        x = viewport.x + (viewport.width - imageData.naturalWidth) / 2
        y = viewport.y + (viewport.height - imageData.naturalHeight) / 2
      }
      
      // Create object on canvas
      const objectId = await context.canvas.addObject({
        type: 'image',
        x,
        y,
        width: imageData.naturalWidth,
        height: imageData.naturalHeight,
        data: imageData,
        metadata: {
          aiGenerated: true,
          prompt: validated.prompt,
          model: 'stable-diffusion-xl',
          generatedAt: new Date().toISOString()
        }
      })
      
      // Select the new object
      context.canvas.selectObject(objectId)
      
      return {
        objectId,
        dimensions: {
          width: imageData.naturalWidth,
          height: imageData.naturalHeight
        }
      }
      
    } catch (error) {
      throw new Error(`Image generation failed: ${this.formatError(error)}`)
    }
  }
} 