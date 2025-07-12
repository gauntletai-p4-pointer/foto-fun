import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { cropTool } from '@/lib/editor/tools/transform/cropTool'

// Input schema following AI SDK v5 patterns
const cropInputSchema = z.object({
  x: z.number().min(0).describe('X coordinate of crop area in pixels relative to object'),
  y: z.number().min(0).describe('Y coordinate of crop area in pixels relative to object'),
  width: z.number().min(1).describe('Width of crop area in pixels (must be at least 1)'),
  height: z.number().min(1).describe('Height of crop area in pixels (must be at least 1)')
})

type CropInput = z.infer<typeof cropInputSchema>

// Output type
interface CropOutput {
  success: boolean
  newDimensions: {
    width: number
    height: number
  }
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the crop tool to make it AI-compatible
 * Crops individual objects by adjusting their visible bounds
 */
export class CropToolAdapter extends UnifiedToolAdapter<CropInput, CropOutput> {
  toolId = 'crop'
  aiName = 'cropObjects'
  description = `Crop objects to focus on specific areas or change aspect ratios. You MUST calculate exact pixel coordinates.

INTELLIGENT TARGETING:
- If you have objects selected, only those objects will be cropped
- If no objects are selected, image objects on the canvas will be cropped

Common crop requests:
- "crop to square" → make width = height, centered
- "crop to focus on [subject]" → estimate subject position and crop around it
- "remove edges" → crop 10-20% from each side
- "crop to 16:9" → calculate 16:9 aspect ratio dimensions
- "crop tighter" → reduce dimensions by 20-30%

NEVER ask for exact coordinates - calculate them based on the object dimensions and user intent.`

  inputSchema = cropInputSchema
  
  async execute(params: CropInput, context: ObjectCanvasContext): Promise<CropOutput> {
    const targets = this.getTargets(context)
    const imageObjects = targets.filter(obj => obj.type === 'image')
    
    if (imageObjects.length === 0) {
      return {
        success: false,
        newDimensions: { width: 0, height: 0 },
        message: 'No image objects found to crop',
        affectedObjects: []
      }
    }
    
    const affectedObjects: string[] = []
    let avgNewWidth = 0
    let avgNewHeight = 0
    
    try {
      // Apply crop to each image object using the underlying tool
      for (const obj of imageObjects) {
        // Get current dimensions
        const currentWidth = obj.width * (obj.scaleX || 1)
        const currentHeight = obj.height * (obj.scaleY || 1)
        
        // Validate and adjust crop bounds if needed
        let adjustedParams = { ...params }
        if (params.x < 0 || params.y < 0 || 
            params.x + params.width > currentWidth || 
            params.y + params.height > currentHeight) {
          console.warn(`Crop bounds exceed object dimensions for ${obj.id}, adjusting...`)
          
          // Adjust crop bounds to fit within object
          adjustedParams = {
            x: Math.max(0, Math.min(params.x, currentWidth - 1)),
            y: Math.max(0, Math.min(params.y, currentHeight - 1)),
            width: Math.min(params.width, currentWidth - Math.max(0, params.x)),
            height: Math.min(params.height, currentHeight - Math.max(0, params.y))
          }
        }
        
        // Use the underlying crop tool to perform the crop
        await cropTool.cropObject(obj, adjustedParams)
        
        affectedObjects.push(obj.id)
        avgNewWidth += adjustedParams.width
        avgNewHeight += adjustedParams.height
      }
      
      avgNewWidth /= affectedObjects.length
      avgNewHeight /= affectedObjects.length
      
      // Generate descriptive message
      const percentReduction = affectedObjects.length > 0 
        ? Math.round((1 - (params.width * params.height) / 
            (imageObjects[0].width * (imageObjects[0].scaleX || 1) * 
             imageObjects[0].height * (imageObjects[0].scaleY || 1))) * 100)
        : 0
      
      let message = `Cropped ${affectedObjects.length} object${affectedObjects.length !== 1 ? 's' : ''} to ${Math.round(avgNewWidth)}x${Math.round(avgNewHeight)}`
      if (percentReduction > 0) {
        message += ` (${percentReduction}% size reduction)`
      }
      
      return {
        success: true,
        newDimensions: {
          width: Math.round(avgNewWidth),
          height: Math.round(avgNewHeight)
        },
        message,
        affectedObjects
      }
    } catch (error) {
      throw new Error(`Crop operation failed: ${this.formatError(error)}`)
    }
  }
} 