import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { ImageGenerationTool, type ImageGenerationOptions } from '@/lib/ai/tools/ImageGenerationTool'

const inputSchema = z.object({
  prompt: z.string().describe('Text description of the image to generate'),
  width: z.number().min(512).max(2048).optional().default(1024),
  height: z.number().min(512).max(2048).optional().default(1024),
  negativePrompt: z.string().optional().default(''),
  modelTier: z.string().optional().describe('Quality tier: fast, balanced, or best'),
  position: z.object({
    x: z.number().optional(),
    y: z.number().optional()
  }).optional()
})

type Input = z.output<typeof inputSchema>

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
  toolId = 'ai-image-generation'
  aiName = 'generateImage'
  description = 'Generate an AI image from a text prompt. Creates a new image object on the canvas.'
  inputSchema = inputSchema
  
  private tool: ImageGenerationTool | null = null
  
  private getOrCreateTool(): ImageGenerationTool {
    if (!this.tool) {
      // TODO: Use proper dependency injection when available
      // For now, create minimal dependencies
      const mockPreferencesManager = {
        getToolModelTier: () => 'balanced',
        setToolModelTier: () => {}
      } as any
      
      const mockEventBus = {
        emit: () => {}
      } as any
      
      this.tool = new ImageGenerationTool(mockPreferencesManager, mockEventBus)
    }
    return this.tool
  }
  
  async execute(params: Input, _context: ObjectCanvasContext): Promise<Output> {
    // Validate input
    const validated = this.validateInput(params)
    
    try {
      // Prepare options for the tool following the same pattern as other adapters
      const options: ImageGenerationOptions = {
        prompt: validated.prompt,
        width: validated.width,
        height: validated.height,
        negativePrompt: validated.negativePrompt,
        modelTier: validated.modelTier,
        // Only include position if both x and y are provided
        ...(validated.position?.x !== undefined && validated.position?.y !== undefined 
          ? { position: { x: validated.position.x, y: validated.position.y } }
          : {})
      }
      
      // Call the tool's main execute method (like other adapters do)
      const resultObject = await this.getOrCreateTool().execute(options)
      
      if (!resultObject) {
        throw new Error('Tool execution failed - no object returned')
      }
      
      return {
        objectId: resultObject.id,
        dimensions: {
          width: resultObject.width,
          height: resultObject.height
        }
      }
      
    } catch (error) {
      throw new Error(`Image generation failed: ${this.formatError(error)}`)
    }
  }
} 