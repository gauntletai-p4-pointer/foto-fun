import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { hueTool } from '@/lib/editor/tools/adjustments/hueTool'

// Define parameter schema
const hueParameters = z.object({
  rotation: z.number().min(-180).max(180)
    .describe('Hue rotation in degrees. Negative values shift towards cool colors, positive values shift towards warm colors. Range: -180 to +180')
})

// Define types
type HueInput = z.infer<typeof hueParameters>

interface HueOutput {
  success: boolean
  rotation: number
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the hue adjustment tool
 * Provides AI-compatible interface for adjusting image hue
 */
export class HueToolAdapter extends UnifiedToolAdapter<HueInput, HueOutput> {
  toolId = 'hue'
  aiName = 'adjust_hue'
  description = `Adjust the hue (color rotation) of images. 
  
  You MUST calculate the rotation value based on user intent:
  - "shift colors" or "rotate hue" → +45 to +90
  - "complementary colors" → +180 or -180
  - "warmer tones" → +20 to +40 (toward red/orange)
  - "cooler tones" → -20 to -40 (toward blue/cyan)
  - "make it more red/orange" → +15 to +30
  - "make it more yellow" → +60 to +80
  - "make it more green" → +120 to +140
  - "make it more blue" → -120 to -90
  - "make it more purple/magenta" → -60 to -30
  
  NEVER ask for exact values - interpret the user's intent.`
  
  inputSchema = hueParameters
  
  async execute(
    params: HueInput, 
    context: ObjectCanvasContext
  ): Promise<HueOutput> {
    const targets = this.getTargets(context)
    const imageObjects = targets.filter(obj => obj.type === 'image')
    
    if (imageObjects.length === 0) {
      return {
        success: false,
        rotation: params.rotation,
        message: 'No image objects found to adjust',
        affectedObjects: []
      }
    }
    
    console.log(`[HueAdapter] Applying hue rotation: ${params.rotation}° to ${imageObjects.length} objects`)
    
    try {
      // Use the underlying hue tool to apply the adjustment
      await hueTool.applyHue(params.rotation)
      
      // Get affected object IDs
      const affectedObjects = imageObjects.map(obj => obj.id)
      
      return {
        success: true,
        rotation: params.rotation,
        message: `Hue rotated by ${params.rotation > 0 ? '+' : ''}${params.rotation}° on ${affectedObjects.length} object(s)`,
        affectedObjects
      }
    } catch (error) {
      throw new Error(`Hue adjustment failed: ${this.formatError(error)}`)
    }
  }
}

// Export default instance for auto-discovery
const hueAdapter = new HueToolAdapter()
export default hueAdapter 