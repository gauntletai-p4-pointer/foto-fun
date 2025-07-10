import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { hueTool } from '@/lib/editor/tools/adjustments/hueTool'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Input schema following AI SDK v5 patterns
const hueParameters = z.object({
  rotation: z.number()
    .min(-180)
    .max(180)
    .describe('Hue rotation in degrees from -180 to 180, where 0 is no change')
})

type HueInput = z.infer<typeof hueParameters>

// Output type
interface HueOutput {
  success: boolean
  previousValue: number
  newValue: number
  affectedImages: number
  targetingMode: 'selection' | 'auto-single'
  message?: string
}

/**
 * Adapter for the hue tool to make it AI-compatible
 * Following AI SDK v5 patterns with intelligent image targeting
 */
export class HueToolAdapter extends BaseToolAdapter<HueInput, HueOutput> {
  tool = hueTool
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
  
  inputSchema = hueParameters
  
  // Add metadata property required by BaseToolAdapter
  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }
  
  async execute(params: HueInput, context: CanvasContext): Promise<HueOutput> {
    console.log('[HueToolAdapter] Execute called with params:', params)
    console.log('[HueToolAdapter] Targeting mode:', context.targetingMode)
    
    // Use pre-filtered target images from enhanced context
    const images = context.targetImages
    
    console.log('[HueToolAdapter] Target images:', images.length)
    console.log('[HueToolAdapter] Targeting mode:', context.targetingMode)
    
    if (images.length === 0) {
      throw new Error('No images found to adjust hue. Please load an image or select images first.')
    }
    
    // Create a selection snapshot from the target images
    const { SelectionSnapshotFactory } = await import('@/lib/ai/execution/SelectionSnapshot')
    const selectionSnapshot = SelectionSnapshotFactory.fromObjects(images)
    
    // Apply the hue adjustment using the base class helper with selection snapshot
    await this.applyToolOperation(this.tool.id, 'rotation', params.rotation, context.canvas, selectionSnapshot)
    
    console.log('[HueToolAdapter] Hue adjustment applied successfully')
    
    // Generate descriptive message based on rotation
    let colorShift = ''
    const normalizedRotation = ((params.rotation % 360) + 360) % 360 // Normalize to 0-360
    
    if (params.rotation === 0) {
      colorShift = 'No color shift applied'
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
    
    const message = `${colorShift} (${params.rotation > 0 ? '+' : ''}${params.rotation}°) on ${images.length} image${images.length !== 1 ? 's' : ''}`
    
    return {
      success: true,
      previousValue: 0, // In a real implementation, we'd track the current hue
      newValue: params.rotation,
      affectedImages: images.length,
      targetingMode: context.targetingMode === 'selection' || context.targetingMode === 'auto-single' 
        ? context.targetingMode 
        : 'auto-single', // Default to auto-single for 'all' or 'none'
      message
    }
  }
  
  canExecute(canvas: CanvasManager): boolean {
    // Can only adjust hue if there are images on the canvas
    const hasImages = canvas.state.layers.some(layer => 
      layer.objects.some(obj => obj.type === 'image')
    )
    if (!hasImages) {
      console.warn('Hue tool: No images on canvas')
    }
    return hasImages
  }
}

// Export default instance for auto-discovery
const hueAdapter = new HueToolAdapter()
export default hueAdapter 