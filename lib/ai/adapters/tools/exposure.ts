import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'

// Define parameter schema
const exposureInputSchema = z.object({
  adjustment: z.number()
    .min(-100)
    .max(100)
    .describe('Exposure adjustment from -100 (darkest) to 100 (brightest)')
})

type ExposureInput = z.infer<typeof exposureInputSchema>

// Define output type
interface ExposureOutput {
  success: boolean
  adjustment: number
  message: string
  affectedObjects: string[]
}

// Create adapter class
export class ExposureToolAdapter extends UnifiedToolAdapter<ExposureInput, ExposureOutput> {
  toolId = 'exposure'
  aiName = 'adjustExposure'
  description = `Adjust the exposure of existing images (simulates camera exposure compensation).

INTELLIGENT TARGETING:
- If you have images selected, only those images will be adjusted
- If no images are selected, all images on the canvas will be adjusted

You MUST calculate the adjustment value based on user intent:
- "increase exposure" or "overexpose" → +30 to +50
- "decrease exposure" or "underexpose" → -30 to -50
- "slightly overexposed" → +15 to +25
- "slightly underexposed" → -15 to -25
- "blown out" or "very overexposed" → +60 to +80
- "very dark" or "very underexposed" → -60 to -80
- "fix overexposure" → -30 to -50
- "fix underexposure" → +30 to +50
- "neutral exposure" → 0
- "adjust exposure by X stops" → X * 33 (each stop ≈ 33 units)
- "turn exposure down by X%" → use -X directly (e.g., "down by 10%" → -10)
- "turn exposure up by X%" → use +X directly (e.g., "up by 15%" → +15)
- "increase exposure X%" → use +X directly 
- "decrease exposure X%" → use -X directly
- "reduce exposure X%" → use -X directly

Note: Exposure has a more dramatic effect than brightness, affecting the entire tonal range.
NEVER ask for exact values - always interpret the user's intent and choose an appropriate value.
Range: -100 (very dark) to +100 (very bright)`

  inputSchema = exposureInputSchema
  
  async execute(params: ExposureInput, context: ObjectCanvasContext): Promise<ExposureOutput> {
    const targets = this.getTargets(context)
    const imageObjects = targets.filter(obj => obj.type === 'image')
    
    if (imageObjects.length === 0) {
      return {
        success: false,
        adjustment: params.adjustment,
        message: 'No image objects found to adjust exposure',
        affectedObjects: []
      }
    }
    
    const affectedObjects: string[] = []
    
    for (const obj of imageObjects) {
      const adjustments = obj.adjustments || []
      
      // Remove existing exposure adjustments
      const filteredAdjustments = adjustments.filter(adj => adj.type !== 'exposure')
      
      // Add new exposure adjustment if not zero
      if (params.adjustment !== 0) {
        filteredAdjustments.push({
          id: `exposure-${Date.now()}`,
          type: 'exposure',
          params: { value: params.adjustment },
          enabled: true
        })
      }
      
      await context.canvas.updateObject(obj.id, {
        adjustments: filteredAdjustments
      })
      
      affectedObjects.push(obj.id)
    }
    
    // Generate descriptive message
    let description = ''
    const magnitude = Math.abs(params.adjustment)
    
    if (params.adjustment === 0) {
      description = 'Reset exposure to neutral'
    } else if (params.adjustment > 0) {
      // Increased exposure (overexposed)
      if (magnitude <= 25) {
        description = 'Slightly brightened exposure'
      } else if (magnitude <= 50) {
        description = 'Moderately increased exposure'
      } else if (magnitude <= 75) {
        description = 'Significantly overexposed'
      } else {
        description = 'Dramatically blown out exposure'
      }
    } else {
      // Decreased exposure (underexposed)
      if (magnitude <= 25) {
        description = 'Slightly darkened exposure'
      } else if (magnitude <= 50) {
        description = 'Moderately reduced exposure'
      } else if (magnitude <= 75) {
        description = 'Significantly underexposed'
      } else {
        description = 'Dramatically darkened exposure'
      }
    }
    
    // Add stop information if applicable
    const stops = Math.abs(params.adjustment / 33)
    const stopInfo = stops >= 0.5 ? ` (~${stops.toFixed(1)} stops)` : ''
    
    const message = `${description} (${params.adjustment > 0 ? '+' : ''}${params.adjustment}%${stopInfo}) on ${affectedObjects.length} object${affectedObjects.length !== 1 ? 's' : ''}`
    
    return {
      success: true,
      adjustment: params.adjustment,
      message,
      affectedObjects
    }
  }
}

// Export singleton instance
const exposureAdapter = new ExposureToolAdapter()
export default exposureAdapter 