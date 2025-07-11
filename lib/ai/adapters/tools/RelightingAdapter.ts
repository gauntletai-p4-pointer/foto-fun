import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { RelightingTool } from '@/lib/ai/tools/RelightingTool'

const inputSchema = z.object({
  lightDirection: z.object({
    x: z.number().min(-1).max(1).describe('Horizontal light direction (-1 = left, 1 = right)'),
    y: z.number().min(-1).max(1).describe('Vertical light direction (-1 = top, 1 = bottom)'),
    z: z.number().min(0).max(1).default(0.5).describe('Light depth (0 = flat, 1 = deep)')
  }).describe('Direction and depth of the new lighting'),
  intensity: z.number().min(0.1).max(2.0).default(1.0).describe('Light intensity (0.1 = dim, 2.0 = bright)'),
  softness: z.number().min(0.0).max(1.0).default(0.5).describe('Light softness (0 = harsh shadows, 1 = soft shadows)'),
  colorTemperature: z.enum(['warm', 'neutral', 'cool']).default('neutral').describe('Color temperature of the light'),
  modelTier: z.enum(['best', 'fast']).default('best').describe('Quality tier: best for highest quality, fast for speed')
})

interface Input {
  lightDirection: {
    x: number
    y: number
    z: number
  }
  intensity: number
  softness: number
  colorTemperature: 'warm' | 'neutral' | 'cool'
  modelTier: 'best' | 'fast'
}

interface Output {
  objectId: string
  lightingSettings: {
    direction: { x: number; y: number; z: number }
    intensity: number
    softness: number
    colorTemperature: string
  }
}

/**
 * AI Adapter for Image Relighting
 * Changes lighting conditions in images using AI
 */
export class RelightingAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'ai-relighting'
  aiName = 'relightImage'
  description = 'Change the lighting conditions in selected images using AI. Adjust light direction, intensity, softness, and color temperature for dramatic lighting effects.'
  inputSchema = inputSchema
  
  private tool = new RelightingTool()
  
  async execute(params: Input, context: ObjectCanvasContext): Promise<Output> {
    // Validate input
    const validated = this.validateInput(params)
    
    // Get image targets only
    const imageTargets = this.getImageTargets(context)
    if (imageTargets.length === 0) {
      throw new Error('No image objects found. Relighting requires at least one selected image.')
    }
    
    // Use the first image target
    const targetImage = imageTargets[0]
    
    try {
      // Convert lightDirection coordinates to direction string
      const lightDirectionStr = this.convertLightDirection(validated.lightDirection)
      
      // Execute relighting
      const resultObject = await this.tool.execute(targetImage, {
        lightDirection: lightDirectionStr,
        intensity: validated.intensity
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
          source: 'ai-relighting',
          originalObjectId: targetImage.id,
          lightDirection: validated.lightDirection,
          intensity: validated.intensity,
          softness: validated.softness,
          colorTemperature: validated.colorTemperature,
          modelTier: validated.modelTier,
          processedAt: new Date().toISOString()
        }
      })
      
      // Select the new object
      context.canvas.selectObject(objectId)
      
      return {
        objectId,
        lightingSettings: {
          direction: validated.lightDirection,
          intensity: validated.intensity,
          softness: validated.softness,
          colorTemperature: validated.colorTemperature
        }
      }
      
    } catch (error) {
      throw new Error(`Relighting failed: ${this.formatError(error)}`)
    }
  }
  
  private convertLightDirection(coords: { x: number; y: number; z: number }): 'left' | 'right' | 'top' | 'bottom' | 'front' {
    // Convert x,y,z coordinates to direction string
    const { x, y } = coords
    
    // Determine primary direction based on strongest component
    if (Math.abs(x) > Math.abs(y)) {
      return x > 0 ? 'right' : 'left'
    } else if (Math.abs(y) > 0.1) {
      return y > 0 ? 'bottom' : 'top'
    } else {
      return 'front'
    }
  }
}