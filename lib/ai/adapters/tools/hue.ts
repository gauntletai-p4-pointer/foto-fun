import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { hueTool } from '@/lib/editor/tools/adjustments/hueTool'
import type { Canvas } from 'fabric'

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
}

/**
 * Adapter for the hue tool to make it AI-compatible
 * Following AI SDK v5 patterns
 */
export class HueToolAdapter extends BaseToolAdapter<HueInput, HueOutput> {
  tool = hueTool
  aiName = 'adjustHue'
  description = `Adjust image hue (color rotation on the color wheel). You MUST calculate the rotation value based on user intent.
Common patterns you should use:
- "shift colors" or "rotate hue" → +45 to +90
- "complementary colors" → +180 or -180
- "rotate hue by X degrees" → use X directly
- Color shifts (rotates ALL colors by same amount):
  - "make it more red/orange" → +10 to +30
  - "make it more yellow" → +50 to +70
  - "make it more green" → +90 to +120
  - "make it more cyan" → +150 to +170
  - "make it more blue" → -120 to -90
  - "make it more purple/magenta" → -60 to -30
NOTE: This rotates ALL colors on the color wheel by the same amount. For warming/cooling effects, use a color temperature or tint adjustment tool instead.
NEVER ask for exact values - always interpret the user's intent and choose an appropriate value.`
  
  inputSchema = hueParameters
  
  async execute(params: HueInput, context: { canvas: Canvas }): Promise<HueOutput> {
    console.log('[HueToolAdapter] Execute called with params:', params)
    
    try {
      // Verify canvas has content
      const objects = context.canvas.getObjects()
      const hasImages = objects.some(obj => obj.type === 'image')
      
      if (!hasImages) {
        throw new Error('No image found on canvas. Please load an image first.')
      }
      
      // Get the hue tool options and update them
      const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
      useToolOptionsStore.getState().updateOption(this.tool.id, 'hue', params.rotation)
      
      return {
        success: true,
        previousValue: 0, // In a real implementation, we'd track the current value
        newValue: params.rotation,
        affectedImages: objects.filter(obj => obj.type === 'image').length
      }
    } catch (error) {
      console.error('[HueToolAdapter] Error:', error)
      return {
        success: false,
        previousValue: 0,
        newValue: 0,
        affectedImages: 0
      }
    }
  }
  
  canExecute(canvas: Canvas): boolean {
    // Can only adjust hue if there are images on the canvas
    const hasImages = canvas.getObjects().some(obj => obj.type === 'image')
    if (!hasImages) {
      console.warn('Hue tool: No images on canvas')
    }
    return hasImages
  }
}

// Export default instance for auto-discovery
export default HueToolAdapter 