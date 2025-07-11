import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { ObjectRemovalTool } from '@/lib/ai/tools/ObjectRemovalTool'

const inputSchema = z.object({
  targetArea: z.object({
    x: z.number().describe('X coordinate of the area to remove'),
    y: z.number().describe('Y coordinate of the area to remove'),
    width: z.number().describe('Width of the area to remove'),
    height: z.number().describe('Height of the area to remove')
  }).describe('Area to remove from the image'),
  modelTier: z.enum(['best', 'alternative']).default('best').describe('Quality tier: best for highest quality, alternative for speed')
})

interface Input {
  targetArea: {
    x: number
    y: number
    width: number
    height: number
  }
  modelTier: 'best' | 'alternative'
}

interface Output {
  objectId: string
  removedArea: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * AI Adapter for Object Removal
 * Removes unwanted objects from images using AI inpainting
 */
export class ObjectRemovalAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'ai-object-removal'
  aiName = 'removeObject'
  description = 'Remove unwanted objects from selected images using AI. Specify the area to remove and the AI will intelligently fill it with appropriate background content.'
  inputSchema = inputSchema
  
  private tool = new ObjectRemovalTool()
  
  async execute(params: Input, context: ObjectCanvasContext): Promise<Output> {
    // Validate input
    const validated = this.validateInput(params)
    
    // Get image targets only
    const imageTargets = this.getImageTargets(context)
    if (imageTargets.length === 0) {
      throw new Error('No image objects found. Object removal requires at least one selected image.')
    }
    
    // Use the first image target
    const targetImage = imageTargets[0]
    
    try {
      // Create a mask object based on the target area
      const maskObject = await this.createMaskObject(validated.targetArea, targetImage, context)
      
      // Execute object removal
      const resultObject = await this.tool.execute(
        targetImage,
        maskObject,
        { modelTier: validated.modelTier }
      )
      
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
          source: 'ai-object-removal',
          originalObjectId: targetImage.id,
          removedArea: validated.targetArea,
          modelTier: validated.modelTier,
          processedAt: new Date().toISOString()
        }
      })
      
      // Select the new object
      context.canvas.selectObject(objectId)
      
      return {
        objectId,
        removedArea: validated.targetArea
      }
      
    } catch (error) {
      throw new Error(`Object removal failed: ${this.formatError(error)}`)
    }
  }
  
  /**
   * Create a mask object for the removal area
   */
  private async createMaskObject(
    area: Input['targetArea'], 
    targetImage: import('@/lib/editor/objects/types').CanvasObject,
    context: ObjectCanvasContext
  ): Promise<import('@/lib/editor/objects/types').CanvasObject> {
    // Create a canvas for the mask
    const canvas = document.createElement('canvas')
    const imageData = targetImage.data as import('@/lib/editor/objects/types').ImageData
    canvas.width = imageData.naturalWidth
    canvas.height = imageData.naturalHeight
    
    const ctx = canvas.getContext('2d')!
    
    // Fill with black (background)
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw white area for removal
    ctx.fillStyle = 'white'
    ctx.fillRect(area.x, area.y, area.width, area.height)
    
    // Convert to image element
    const maskImage = new Image()
    await new Promise<void>((resolve, reject) => {
      maskImage.onload = () => resolve()
      maskImage.onerror = reject
      maskImage.src = canvas.toDataURL()
    })
    
    // Create mask object
    return {
      id: `mask_${Date.now()}`,
      type: 'image',
      name: 'Removal Mask',
      x: targetImage.x,
      y: targetImage.y,
      width: targetImage.width,
      height: targetImage.height,
      rotation: 0,
      scaleX: targetImage.scaleX || 1,
      scaleY: targetImage.scaleY || 1,
      zIndex: 1,
      opacity: 1,
      visible: true,
      locked: false,
      blendMode: 'normal',
      filters: [],
      adjustments: [],
      data: {
        src: canvas.toDataURL(),
        naturalWidth: canvas.width,
        naturalHeight: canvas.height,
        element: maskImage
      },
      metadata: {
        type: 'removal-mask',
        targetArea: area
      }
    }
  }
}