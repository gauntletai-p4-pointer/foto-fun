import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { exposureTool } from '@/lib/editor/tools/adjustments/exposureTool'

// Define parameter schema
const exposureParameters = z.object({
  stops: z.number().min(-3).max(3)
    .describe('Exposure adjustment in stops. Negative values darken, positive values brighten. Range: -3 to +3 EV')
})

// Define types
type ExposureInput = z.infer<typeof exposureParameters>

interface ExposureOutput {
  success: boolean
  stops: number
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the exposure adjustment tool
 * Provides AI-compatible interface for adjusting image exposure
 */
export class ExposureToolAdapter extends UnifiedToolAdapter<ExposureInput, ExposureOutput> {
  toolId = 'exposure'
  aiName = 'adjust_exposure'
  description = `Adjust the exposure of images (simulates camera exposure compensation). 
  
  You MUST calculate the exposure value based on user intent:
  - "increase exposure" or "overexpose" → +1.0 to +1.5 stops
  - "decrease exposure" or "underexpose" → -1.0 to -1.5 stops
  - "slightly overexposed" → +0.5 to +0.8 stops
  - "slightly underexposed" → -0.5 to -0.8 stops
  - "blown out" or "very overexposed" → +2.0 to +3.0 stops
  - "very dark" or "very underexposed" → -2.0 to -3.0 stops
  - "fix overexposure" → -1.0 to -1.5 stops
  - "fix underexposure" → +1.0 to +1.5 stops
  - "neutral exposure" → 0 stops
  
  NEVER ask for exact values - interpret the user's intent.`
  
  inputSchema = exposureParameters
  
  async execute(
    params: ExposureInput, 
    context: ObjectCanvasContext
  ): Promise<ExposureOutput> {
    const targets = this.getTargets(context)
    const imageObjects = targets.filter(obj => obj.type === 'image')
    
    if (imageObjects.length === 0) {
      return {
        success: false,
        stops: params.stops,
        message: 'No image objects found to adjust',
        affectedObjects: []
      }
    }
    
    console.log(`[ExposureAdapter] Applying exposure adjustment: ${params.stops} stops to ${imageObjects.length} objects`)
    
    try {
      // Use the underlying exposure tool to apply the adjustment
      await exposureTool.applyExposure(params.stops)
      
      // Get affected object IDs
      const affectedObjects = imageObjects.map(obj => obj.id)
      
      return {
        success: true,
        stops: params.stops,
        message: `Exposure adjusted by ${params.stops > 0 ? '+' : ''}${params.stops} EV on ${affectedObjects.length} object(s)`,
        affectedObjects
      }
    } catch (error) {
      throw new Error(`Exposure adjustment failed: ${this.formatError(error)}`)
    }
  }
}

// Export singleton instance
const exposureAdapter = new ExposureToolAdapter()
export default exposureAdapter 