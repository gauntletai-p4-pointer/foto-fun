import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { colorTemperatureTool } from '@/lib/editor/tools/adjustments/colorTemperatureTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Define parameter schema
const colorTemperatureParameters = z.object({
  adjustment: z.number()
    .min(-100)
    .max(100)
    .describe('Color temperature adjustment from -100 (coolest/blue) to 100 (warmest/orange)')
})

type ColorTemperatureInput = z.infer<typeof colorTemperatureParameters>

// Define output type
interface ColorTemperatureOutput {
  success: boolean
  adjustment: number
  message: string
  targetingMode: 'selection' | 'all-images'
}

// Create adapter class
export class ColorTemperatureToolAdapter extends BaseToolAdapter<ColorTemperatureInput, ColorTemperatureOutput> {
  tool = colorTemperatureTool
  aiName = 'adjustColorTemperature'
  description = `Adjust the color temperature of existing images to make them warmer or cooler.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be adjusted
- If no images are selected, all images on the canvas will be adjusted

You MUST calculate the adjustment value based on user intent:
- "warmer" or "more warm" → +20 to +30
- "much warmer" or "very warm" → +40 to +60
- "cooler" or "more cool" → -20 to -30
- "much cooler" or "very cool" → -40 to -60
- "neutral temperature" → 0

NEVER ask for exact values - interpret the user's intent.
Range: -100 (very cool/blue) to +100 (very warm/orange)`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = colorTemperatureParameters
  
  async execute(params: ColorTemperatureInput, context: CanvasContext): Promise<ColorTemperatureOutput> {
    try {
      console.log('[ColorTemperatureToolAdapter] Execute called with params:', params)
      console.log('[ColorTemperatureToolAdapter] Targeting mode:', context.targetingMode)
      
      // Use pre-filtered target images from enhanced context
      const images = context.targetImages
      
      console.log('[ColorTemperatureToolAdapter] Target images:', images.length)
      console.log('[ColorTemperatureToolAdapter] Targeting mode:', context.targetingMode)
      
      if (images.length === 0) {
        throw new Error('No images found to adjust color temperature. Please load an image or select images first.')
      }
      
      // Create a selection snapshot from the target images
      const { SelectionSnapshotFactory } = await import('@/lib/ai/execution/SelectionSnapshot')
      const selectionSnapshot = SelectionSnapshotFactory.fromObjects(images)
      
      // Apply the color temperature adjustment using the base class helper with selection snapshot
      await this.applyToolOperation(this.tool.id, 'temperature', params.adjustment, context.canvas, selectionSnapshot)
      
      return {
        success: true,
        adjustment: params.adjustment,
        message: `Adjusted color temperature by ${params.adjustment > 0 ? '+' : ''}${params.adjustment}% (${params.adjustment > 0 ? 'warmer' : 'cooler'})`,
        targetingMode: context.targetingMode
      }
    } catch (error) {
      return {
        success: false,
        adjustment: 0,
        message: error instanceof Error ? error.message : 'Failed to adjust color temperature',
        targetingMode: context.targetingMode
      }
    }
  }
}

// Export singleton instance
const colorTemperatureAdapter = new ColorTemperatureToolAdapter()
export default colorTemperatureAdapter 