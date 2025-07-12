import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { OutpaintingTool } from '@/lib/ai/tools/OutpaintingTool'

const inputSchema = z.object({
  direction: z.enum(['top', 'right', 'bottom', 'left', 'all']).describe('Direction to expand the image'),
  expandSize: z.number().min(32).max(512).default(256).describe('Number of pixels to expand in the specified direction'),
  prompt: z.string().optional().describe('Description of what to generate in the expanded area (if not provided, AI will extend naturally)'),
  seamlessBlend: z.boolean().default(true).describe('Whether to blend the expansion seamlessly with the original image')
})

type Input = z.output<typeof inputSchema>

interface Output {
  objectId: string
  originalDimensions: { width: number; height: number }
  newDimensions: { width: number; height: number }
  expandedDirection: string
  expandedPixels: number
}

/**
 * AI Adapter for Outpainting
 * Extends images beyond their boundaries using AI
 */
export class OutpaintingAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'outpainting'
  aiName = 'extendImage'
  description = 'Extend images beyond their boundaries using AI. The AI intelligently generates new content that seamlessly continues the existing image in the specified direction.'
  inputSchema = inputSchema
  
  private tool = new OutpaintingTool()
  
  async execute(params: Input, context: ObjectCanvasContext): Promise<Output> {
    // Validate input
    const validated = this.validateInput(params)
    
    // Get image targets only
    const imageTargets = this.getImageTargets(context)
    if (imageTargets.length === 0) {
      throw new Error('No image objects found. Outpainting requires at least one selected image.')
    }
    
    // Use the first image target
    const targetImage = imageTargets[0]
    const imageData = targetImage.data as import('@/lib/editor/objects/types').ImageData
    
    // Store original dimensions
    const originalDimensions = {
      width: imageData.naturalWidth,
      height: imageData.naturalHeight
    }
    
    try {
      // Set options on the tool
      this.tool.setOption('expandSize', validated.expandSize)
      this.tool.setOption('seamlessBlend', validated.seamlessBlend)
      if (validated.prompt) {
        this.tool.setOption('prompt', validated.prompt)
      }
      
      // Execute outpainting
      await this.tool.applyWithContext(
        validated.direction,
        validated.expandSize,
        validated.prompt,
        targetImage
      )
      
      // Calculate new dimensions based on direction
      const newDimensions = { ...originalDimensions }
      
      switch (validated.direction) {
        case 'top':
        case 'bottom':
          newDimensions.height += validated.expandSize
          break
        case 'left':
        case 'right':
          newDimensions.width += validated.expandSize
          break
        case 'all':
          newDimensions.width += validated.expandSize * 2
          newDimensions.height += validated.expandSize * 2
          break
      }
      
      // The tool updates the object in place, so we return the same ID
      return {
        objectId: targetImage.id,
        originalDimensions,
        newDimensions,
        expandedDirection: validated.direction,
        expandedPixels: validated.expandSize
      }
      
    } catch (error) {
      throw new Error(`Outpainting failed: ${this.formatError(error)}`)
    }
  }
}