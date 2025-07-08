import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { colorTemperatureTool } from '@/lib/editor/tools/adjustments/colorTemperatureTool'
import type { Canvas } from 'fabric'

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
}

// Create adapter class
export class ColorTemperatureToolAdapter extends BaseToolAdapter<ColorTemperatureInput, ColorTemperatureOutput> {
  tool = colorTemperatureTool
  aiName = 'adjustColorTemperature'
  description = `Adjust image color temperature (warm/cool tones). You MUST calculate the adjustment value based on user intent.
Common patterns you should use:
- "warmer" or "warm it up" → +30 to +40
- "much warmer" or "very warm" → +50 to +70
- "slightly warmer" → +15 to +25
- "cooler" or "cool it down" → -30 to -40
- "much cooler" or "very cool" → -50 to -70
- "slightly cooler" → -15 to -25
- "golden hour" or "sunset" → +60 to +80
- "blue hour" or "cold" → -60 to -80
Note: This adjusts the overall color temperature by shifting the balance between warm (orange/red) and cool (blue) tones.
NEVER ask for exact values - always interpret the user's intent and choose an appropriate value.`
  
  inputSchema = colorTemperatureParameters
  
  async execute(params: ColorTemperatureInput, context: { canvas: Canvas }): Promise<ColorTemperatureOutput> {
    try {
      // Verify canvas has content
      const objects = context.canvas.getObjects()
      const hasImages = objects.some(obj => obj.type === 'image')
      
      if (!hasImages) {
        throw new Error('No image found on canvas. Please load an image first.')
      }
      
      // Get the color temperature tool options and update them
      const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
      useToolOptionsStore.getState().updateOption(this.tool.id, 'temperature', params.adjustment)
      
      return {
        success: true,
        adjustment: params.adjustment,
        message: `Adjusted color temperature by ${params.adjustment > 0 ? '+' : ''}${params.adjustment}% (${params.adjustment > 0 ? 'warmer' : 'cooler'})`
      }
    } catch (error) {
      return {
        success: false,
        adjustment: 0,
        message: error instanceof Error ? error.message : 'Failed to adjust color temperature'
      }
    }
  }
}

// Export singleton instance
const colorTemperatureAdapter = new ColorTemperatureToolAdapter()
export default colorTemperatureAdapter 