import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { InpaintingTool } from '@/lib/ai/tools/InpaintingTool'

const inputSchema = z.object({
  prompt: z.string().describe('Description of what to fill the masked area with'),
  maskArea: z.object({
    x: z.number().describe('X coordinate of the area to inpaint'),
    y: z.number().describe('Y coordinate of the area to inpaint'),
    width: z.number().describe('Width of the area to inpaint'),
    height: z.number().describe('Height of the area to inpaint')
  }).optional().describe('Specific area to inpaint (if not provided, uses existing selection)'),
  brushSize: z.number().min(5).max(100).default(20).describe('Brush size for manual mask drawing'),
  useSelection: z.boolean().default(false).describe('Use existing canvas selection as mask instead of specified area')
})

type Input = z.output<typeof inputSchema>

interface Output {
  objectId: string
  inpaintedArea: {
    x: number
    y: number
    width: number
    height: number
  }
  prompt: string
}

/**
 * AI Adapter for Inpainting
 * Intelligently fills masked areas in images using AI
 */
export class InpaintingAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'inpainting'
  aiName = 'inpaintArea'
  description = 'Intelligently fill or replace specific areas in images using AI. Specify what you want to fill the area with and the AI will seamlessly blend it into the image.'
  inputSchema = inputSchema
  
  private tool = new InpaintingTool()
  
  async execute(params: Input, context: ObjectCanvasContext): Promise<Output> {
    // Validate input
    const validated = this.validateInput(params)
    
    // Get image targets only
    const imageTargets = this.getImageTargets(context)
    if (imageTargets.length === 0) {
      throw new Error('No image objects found. Inpainting requires at least one selected image.')
    }
    
    // Use the first image target
    const targetImage = imageTargets[0]
    
    try {
      // Set options on the tool
      this.tool.setOption('prompt', validated.prompt)
      this.tool.setOption('brushSize', validated.brushSize)
      
      let maskData: ImageData | undefined
      let inpaintedArea: { x: number; y: number; width: number; height: number }
      
      if (validated.useSelection || !validated.maskArea) {
        // Use existing selection as mask
        await this.tool.applyWithContext(
          validated.prompt,
          targetImage,
          undefined // Let tool use existing selection
        )
        
        // Get selection bounds for response
        const canvas = context.canvas
        const selectionManager = canvas.getSelectionManager()
        const selection = selectionManager.getSelection()
        
        if (selection) {
          inpaintedArea = selection.bounds
        } else {
          // Fallback to entire image if no selection
          inpaintedArea = {
            x: 0,
            y: 0,
            width: targetImage.width,
            height: targetImage.height
          }
        }
      } else {
        // Create mask from specified area
        maskData = await this.createMaskFromArea(validated.maskArea, targetImage)
        inpaintedArea = validated.maskArea
        
        await this.tool.applyWithContext(
          validated.prompt,
          targetImage,
          maskData
        )
      }
      
      // The tool updates the object in place, so we return the same ID
      return {
        objectId: targetImage.id,
        inpaintedArea,
        prompt: validated.prompt
      }
      
    } catch (error) {
      throw new Error(`Inpainting failed: ${this.formatError(error)}`)
    }
  }
  
  /**
   * Create mask ImageData from specified area
   */
  private async createMaskFromArea(
    area: { x: number; y: number; width: number; height: number },
    targetImage: import('@/lib/editor/objects/types').CanvasObject
  ): Promise<ImageData> {
    // Create a canvas for the mask
    const canvas = document.createElement('canvas')
    const imageData = targetImage.data as import('@/lib/editor/objects/types').ImageData
    canvas.width = imageData.naturalWidth
    canvas.height = imageData.naturalHeight
    
    const ctx = canvas.getContext('2d')!
    
    // Fill with black (background - don't inpaint)
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw white area for inpainting
    ctx.fillStyle = 'white'
    ctx.fillRect(area.x, area.y, area.width, area.height)
    
    // Return ImageData
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  }
}