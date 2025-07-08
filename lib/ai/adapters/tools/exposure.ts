import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { exposureTool } from '@/lib/editor/tools/adjustments/exposureTool'
import type { Canvas } from 'fabric'

// Define parameter schema
const exposureParameters = z.object({
  adjustment: z.number()
    .min(-100)
    .max(100)
    .describe('Exposure adjustment from -100 (darkest) to 100 (brightest)')
})

type ExposureInput = z.infer<typeof exposureParameters>

// Define output type
interface ExposureOutput {
  success: boolean
  adjustment: number
  message: string
}

// Create adapter class
export class ExposureToolAdapter extends BaseToolAdapter<ExposureInput, ExposureOutput> {
  tool = exposureTool
  aiName = 'adjustExposure'
  description = `Adjust image exposure (simulates camera exposure compensation). You MUST calculate the adjustment value based on user intent.
Common patterns you should use:
- "increase exposure" or "overexpose" → +30 to +50
- "decrease exposure" or "underexpose" → -30 to -50
- "slightly overexposed" → +15 to +25
- "slightly underexposed" → -15 to -25
- "blown out" or "very overexposed" → +60 to +80
- "very dark" or "very underexposed" → -60 to -80
- "adjust exposure by X stops" → X * 33 (each stop ≈ 33 units)
Note: Exposure has a more dramatic effect than brightness, affecting the entire tonal range.
NEVER ask for exact values - always interpret the user's intent and choose an appropriate value.`
  
  inputSchema = exposureParameters
  
  async execute(params: ExposureInput, context: { canvas: Canvas }): Promise<ExposureOutput> {
    try {
      // Verify canvas has content
      const objects = context.canvas.getObjects()
      const hasImages = objects.some(obj => obj.type === 'image')
      
      if (!hasImages) {
        throw new Error('No image found on canvas. Please load an image first.')
      }
      
      // Get the exposure tool options and update them
      const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
      useToolOptionsStore.getState().updateOption(this.tool.id, 'exposure', params.adjustment)
      
      return {
        success: true,
        adjustment: params.adjustment,
        message: `Adjusted exposure by ${params.adjustment > 0 ? '+' : ''}${params.adjustment}%`
      }
    } catch (error) {
      return {
        success: false,
        adjustment: 0,
        message: error instanceof Error ? error.message : 'Failed to adjust exposure'
      }
    }
  }
}

// Export singleton instance
const exposureAdapter = new ExposureToolAdapter()
export default exposureAdapter 