import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'

// Input schema following AI SDK v5 patterns
const hueInputSchema = z.object({
  rotation: z.number()
    .min(-180)
    .max(180)
    .describe('Hue rotation in degrees from -180 to 180, where 0 is no change')
})

type HueInput = z.infer<typeof hueInputSchema>

// Output type
interface HueOutput {
  success: boolean
  rotation: number
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the hue tool to make it AI-compatible
 * Following AI SDK v5 patterns with intelligent image targeting
 */
export class HueToolAdapter extends UnifiedToolAdapter<HueInput, HueOutput> {
  toolId = 'hue'
  aiName = 'adjustHue'
  description = `Adjust image hue (color rotation on the color wheel). You MUST calculate the rotation value based on user intent.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be adjusted
- If no images are selected, all images on the canvas will be adjusted

IMPORTANT: When user specifies exact degrees, ALWAYS use that value directly:
- "shift hue by 70 degrees" → use 70
- "rotate hue by -45 degrees" → use -45
- "warmer tones by 60 degrees" → use 60 (ignore the "warmer" part, use the explicit degrees)

If NO explicit degrees are given, use these patterns:
- "shift colors" or "rotate hue" → +45 to +90
- "complementary colors" → +180 or -180
- Color shifts (rotates ALL colors by same amount):
  - "make it more red/orange" → +15 to +30
  - "make it more yellow" → +60 to +80
  - "make it more green" → +120 to +140
  - "make it more cyan" → +180 to +200 (or -180 to -160)
  - "make it more blue" → -120 to -90
  - "make it more purple/magenta" → -60 to -30
- "warmer tones" (no degrees specified) → +20 to +40 (toward red/orange)
- "cooler tones" (no degrees specified) → -20 to -40 (toward blue/cyan)

NOTE: This rotates ALL colors on the color wheel by the same amount.
NEVER ask for exact values - always interpret the user's intent and choose an appropriate value.`
  
  inputSchema = hueInputSchema
  
  async execute(params: HueInput, context: ObjectCanvasContext): Promise<HueOutput> {
    const targets = this.getTargets(context)
    const imageObjects = targets.filter(obj => obj.type === 'image')
    
    if (imageObjects.length === 0) {
      return {
        success: false,
        rotation: params.rotation,
        message: 'No image objects found to adjust hue',
        affectedObjects: []
      }
    }
    
    const affectedObjects: string[] = []
    
    for (const obj of imageObjects) {
      const adjustments = obj.adjustments || []
      
      // Remove existing hue adjustments
      const filteredAdjustments = adjustments.filter(adj => adj.type !== 'hue')
      
      // Add new hue adjustment if not zero
      if (params.rotation !== 0) {
        filteredAdjustments.push({
          id: `hue-${Date.now()}`,
          type: 'hue',
          params: { value: params.rotation },
          enabled: true
        })
      }
      
      await context.canvas.updateObject(obj.id, {
        adjustments: filteredAdjustments
      })
      
      affectedObjects.push(obj.id)
    }
    
    // Generate descriptive message based on rotation
    let colorShift = ''
    const normalizedRotation = ((params.rotation % 360) + 360) % 360 // Normalize to 0-360
    
    if (params.rotation === 0) {
      colorShift = 'Reset hue to original colors'
    } else if (params.rotation === 180 || params.rotation === -180) {
      colorShift = 'Shifted to complementary colors'
    } else if (normalizedRotation >= 345 || normalizedRotation <= 30) {
      colorShift = 'Shifted colors toward red/orange tones'
    } else if (normalizedRotation > 30 && normalizedRotation <= 90) {
      colorShift = 'Shifted colors toward yellow/green tones'
    } else if (normalizedRotation > 90 && normalizedRotation <= 150) {
      colorShift = 'Shifted colors toward green/cyan tones'
    } else if (normalizedRotation > 150 && normalizedRotation <= 210) {
      colorShift = 'Shifted colors toward cyan/blue tones'
    } else if (normalizedRotation > 210 && normalizedRotation <= 270) {
      colorShift = 'Shifted colors toward blue/purple tones'
    } else {
      colorShift = 'Shifted colors toward purple/magenta tones'
    }
    
    const message = `${colorShift} (${params.rotation > 0 ? '+' : ''}${params.rotation}°) on ${affectedObjects.length} object${affectedObjects.length !== 1 ? 's' : ''}`
    
    return {
      success: true,
      rotation: params.rotation,
      message,
      affectedObjects
    }
  }
}

// Export default instance for auto-discovery
const hueAdapter = new HueToolAdapter()
export default hueAdapter 