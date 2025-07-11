import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { brightnessTool } from '@/lib/editor/tools/adjustments/brightnessTool'

// Define parameter schema
const brightnessParameters = z.object({
  adjustment: z.number().min(-100).max(100)
    .describe('Brightness adjustment percentage. Negative values darken, positive values brighten. Range: -100 to +100')
})

// Define types
type BrightnessInput = z.infer<typeof brightnessParameters>

interface BrightnessOutput {
  success: boolean
  adjustment: number
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the brightness adjustment tool
 * Provides AI-compatible interface for adjusting image brightness
 */
export class BrightnessToolAdapter extends UnifiedToolAdapter<BrightnessInput, BrightnessOutput> {
  toolId = 'brightness'
  aiName = 'adjust_brightness'
  description = `Adjust the brightness of images. 
  
  You MUST calculate the adjustment value based on user intent:
  - "brighter" or "lighter" → +20 to +30
  - "much brighter" → +40 to +60
  - "slightly brighter" → +10 to +15
  - "darker" → -20 to -30
  - "much darker" → -40 to -60
  - "slightly darker" → -10 to -15
  
  NEVER ask for exact values - interpret the user's intent.`
  
  inputSchema = brightnessParameters
  
  async execute(
    params: BrightnessInput, 
    context: ObjectCanvasContext
  ): Promise<BrightnessOutput> {
    const targets = this.getTargets(context)
    const imageObjects = targets.filter(obj => obj.type === 'image')
    
    if (imageObjects.length === 0) {
      return {
        success: false,
        adjustment: params.adjustment,
        message: 'No image objects found to adjust',
        affectedObjects: []
      }
    }
    
    console.log(`[BrightnessAdapter] Applying brightness adjustment: ${params.adjustment}% to ${imageObjects.length} objects`)
    
    // Apply brightness adjustment to each image object
    const affectedObjects: string[] = []
    
    for (const obj of imageObjects) {
      // Add brightness to the object's adjustments array
      const adjustments = obj.adjustments || []
      
      // Remove any existing brightness adjustments
      const filteredAdjustments = adjustments.filter(adj => adj.type !== 'brightness')
      
      // Add new brightness adjustment if not zero
      if (params.adjustment !== 0) {
        filteredAdjustments.push({
          id: `brightness-${Date.now()}`,
          type: 'brightness',
          params: { value: params.adjustment },
          enabled: true
        })
      }
      
      // Update the object
      await context.canvas.updateObject(obj.id, {
        adjustments: filteredAdjustments
      })
      
      affectedObjects.push(obj.id)
    }
    
    return {
      success: true,
      adjustment: params.adjustment,
      message: `Brightness adjusted by ${params.adjustment > 0 ? '+' : ''}${params.adjustment}% on ${affectedObjects.length} object(s)`,
      affectedObjects
    }
  }
} 