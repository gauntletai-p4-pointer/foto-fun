import { z } from 'zod'
import { generateObject } from 'ai'
import { openai } from '@/lib/ai/providers'
import { BaseParameterResolver } from './base'
import type { CanvasContext } from '../../tools/canvas-bridge'

// Schema for parsing natural language crop requests
const CropIntentSchema = z.object({
  mode: z.enum(['percentage', 'aspect-ratio', 'absolute', 'center-crop']).describe('The type of crop operation'),
  
  // For percentage mode
  percentageFromEdges: z.number().min(0).max(50).optional().describe('Percentage to crop from all edges'),
  percentageLeft: z.number().min(0).max(100).optional().describe('Percentage to crop from left'),
  percentageRight: z.number().min(0).max(100).optional().describe('Percentage to crop from right'),
  percentageTop: z.number().min(0).max(100).optional().describe('Percentage to crop from top'),
  percentageBottom: z.number().min(0).max(100).optional().describe('Percentage to crop from bottom'),
  
  // For aspect ratio mode
  aspectRatio: z.string().optional().describe('Aspect ratio like "16:9", "4:3", "1:1"'),
  position: z.enum(['center', 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).optional(),
  
  // For absolute mode
  x: z.number().min(0).optional().describe('X coordinate in pixels'),
  y: z.number().min(0).optional().describe('Y coordinate in pixels'),
  width: z.number().min(1).optional().describe('Width in pixels'),
  height: z.number().min(1).optional().describe('Height in pixels'),
  
  // For center crop
  targetWidth: z.number().min(1).optional().describe('Target width for center crop'),
  targetHeight: z.number().min(1).optional().describe('Target height for center crop')
})

type CropIntent = z.infer<typeof CropIntentSchema>

// Output schema matching the crop tool
type CropInput = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Resolves natural language crop requests to exact coordinates
 */
export class CropParameterResolver extends BaseParameterResolver<CropInput> {
  async resolve(naturalInput: string, context: CanvasContext): Promise<CropInput> {
    const { width: canvasWidth, height: canvasHeight } = context.dimensions
    
    // Use GPT-4 to understand the crop intent
    const { object: intent } = await generateObject({
      model: openai('gpt-4'),
      schema: CropIntentSchema,
      system: `You are parsing crop requests for an image editor. The canvas dimensions are ${canvasWidth}x${canvasHeight} pixels.
      
Examples:
- "crop 10% from all sides" → mode: percentage, percentageFromEdges: 10
- "crop to 16:9" → mode: aspect-ratio, aspectRatio: "16:9", position: "center"
- "crop the left half" → mode: percentage, percentageRight: 50
- "crop to 400x300" → mode: center-crop, targetWidth: 400, targetHeight: 300
- "crop from 100,100 to 500,400" → mode: absolute, x: 100, y: 100, width: 400, height: 300`,
      prompt: naturalInput
    })
    
    return this.convertToAbsolute(intent, canvasWidth, canvasHeight)
  }
  
  private convertToAbsolute(intent: CropIntent, canvasWidth: number, canvasHeight: number): CropInput {
    switch (intent.mode) {
      case 'percentage': {
        let x = 0, y = 0, width = canvasWidth, height = canvasHeight
        
        if (intent.percentageFromEdges !== undefined) {
          const cropPixels = {
            x: (canvasWidth * intent.percentageFromEdges) / 100,
            y: (canvasHeight * intent.percentageFromEdges) / 100
          }
          x = cropPixels.x
          y = cropPixels.y
          width = canvasWidth - (cropPixels.x * 2)
          height = canvasHeight - (cropPixels.y * 2)
        } else {
          // Handle individual edge percentages
          const left = (intent.percentageLeft || 0) * canvasWidth / 100
          const right = (intent.percentageRight || 0) * canvasWidth / 100
          const top = (intent.percentageTop || 0) * canvasHeight / 100
          const bottom = (intent.percentageBottom || 0) * canvasHeight / 100
          
          x = left
          y = top
          width = canvasWidth - left - right
          height = canvasHeight - top - bottom
        }
        
        return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }
      }
      
      case 'aspect-ratio': {
        if (!intent.aspectRatio) throw new Error('Aspect ratio not specified')
        
        const [widthRatio, heightRatio] = intent.aspectRatio.split(':').map(Number)
        const targetAspect = widthRatio / heightRatio
        const currentAspect = canvasWidth / canvasHeight
        
        let width: number, height: number
        
        if (currentAspect > targetAspect) {
          // Canvas is wider than target ratio
          height = canvasHeight
          width = height * targetAspect
        } else {
          // Canvas is taller than target ratio
          width = canvasWidth
          height = width / targetAspect
        }
        
        // Position the crop area
        let x = 0, y = 0
        const position = intent.position || 'center'
        
        if (position.includes('center')) {
          x = (canvasWidth - width) / 2
          y = (canvasHeight - height) / 2
        }
        if (position.includes('right')) x = canvasWidth - width
        if (position.includes('bottom')) y = canvasHeight - height
        
        return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }
      }
      
      case 'absolute': {
        if (intent.x === undefined || intent.y === undefined || 
            intent.width === undefined || intent.height === undefined) {
          throw new Error('Absolute crop requires x, y, width, and height')
        }
        
        return {
          x: Math.round(intent.x),
          y: Math.round(intent.y),
          width: Math.round(intent.width),
          height: Math.round(intent.height)
        }
      }
      
      case 'center-crop': {
        if (!intent.targetWidth || !intent.targetHeight) {
          throw new Error('Center crop requires target width and height')
        }
        
        const x = (canvasWidth - intent.targetWidth) / 2
        const y = (canvasHeight - intent.targetHeight) / 2
        
        return {
          x: Math.round(Math.max(0, x)),
          y: Math.round(Math.max(0, y)),
          width: Math.round(Math.min(intent.targetWidth, canvasWidth)),
          height: Math.round(Math.min(intent.targetHeight, canvasHeight))
        }
      }
      
      default:
        throw new Error(`Unknown crop mode: ${intent.mode}`)
    }
  }
} 