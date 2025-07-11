import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
// import { saturationTool } from '@/lib/editor/tools/adjustments/saturationTool'

// Define parameter schema
const saturationParameters = z.object({
  adjustment: z.number().min(-100).max(100)
    .describe('Saturation adjustment percentage. Negative values reduce saturation (towards grayscale), positive values increase saturation (more vibrant). Range: -100 to +100')
})

// Define types
type SaturationInput = z.infer<typeof saturationParameters>

interface SaturationOutput {
  success: boolean
  adjustment: number
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the saturation adjustment tool
 * Provides AI-compatible interface for adjusting image saturation
 */
export class SaturationToolAdapter extends UnifiedToolAdapter<SaturationInput, SaturationOutput> {
  toolId = 'saturation'
  aiName = 'adjust_saturation'
  description = `Adjust the color saturation of images. 
  
  You MUST calculate the adjustment value based on user intent:
  - "more vibrant" or "more saturated" → +20 to +30
  - "much more vibrant" → +40 to +60
  - "slightly more vibrant" → +10 to +15
  - "less vibrant" or "desaturated" → -20 to -30
  - "muted colors" → -40 to -60
  - "slightly less vibrant" → -10 to -15
  - "black and white" or "grayscale" → -100
  
  NEVER ask for exact values - interpret the user's intent.`
  
  inputSchema = saturationParameters
  
  async execute(
    params: SaturationInput, 
    context: ObjectCanvasContext
  ): Promise<SaturationOutput> {
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
    
    console.log(`[SaturationAdapter] Applying saturation adjustment: ${params.adjustment}% to ${imageObjects.length} objects`)
    
    // Apply saturation adjustment to each image object
    const affectedObjects: string[] = []
    
    for (const obj of imageObjects) {
      // Add saturation to the object's adjustments array
      const adjustments = obj.adjustments || []
      
      // Remove any existing saturation adjustments
      const filteredAdjustments = adjustments.filter(adj => adj.type !== 'saturation')
      
      // Add new saturation adjustment if not zero
      if (params.adjustment !== 0) {
        filteredAdjustments.push({
          id: `saturation-${Date.now()}`,
          type: 'saturation',
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
      message: `Saturation adjusted by ${params.adjustment > 0 ? '+' : ''}${params.adjustment}% on ${affectedObjects.length} object(s)`,
      affectedObjects
    }
  }
} 