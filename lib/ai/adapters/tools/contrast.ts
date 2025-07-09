import { z } from 'zod'
import { FilterToolAdapter } from '../base'
import { contrastTool } from '@/lib/editor/tools/adjustments/contrastTool'
import { filters } from 'fabric'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Input schema following AI SDK v5 patterns
const contrastParameters = z.object({
  adjustment: z.number()
    .min(-100)
    .max(100)
    .describe('Contrast adjustment from -100 (flat) to 100 (maximum), where 0 is no change')
})

type ContrastInput = z.infer<typeof contrastParameters>

// Output type
interface ContrastOutput {
  success: boolean
  previousValue: number
  newValue: number
  affectedImages: number
  targetingMode: 'selection' | 'all-images'
}

/**
 * Adapter for the contrast tool to make it AI-compatible
 * Following AI SDK v5 patterns with intelligent image targeting
 */
export class ContrastToolAdapter extends FilterToolAdapter<ContrastInput, ContrastOutput> {
  tool = contrastTool
  aiName = 'adjustContrast'
  description = `Adjust the contrast of existing images on the canvas. This tool increases or decreases the difference between light and dark areas.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be adjusted
- If no images are selected, all images on the canvas will be adjusted

You MUST calculate the adjustment value based on user intent:
- "more contrast" or "higher contrast" → +20 to +30
- "much more contrast" or "very high contrast" → +40 to +60
- "slightly more contrast" → +10 to +15
- "less contrast" or "lower contrast" → -20 to -30
- "much less contrast" or "very low contrast" → -40 to -60
- "flat" or "washed out" → -60 to -80

NEVER ask for exact values - interpret the user's intent and calculate appropriate adjustment values.
Range: -100 (completely flat) to +100 (maximum contrast)`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = contrastParameters
  
  protected getActionVerb(): string {
    return 'adjust contrast'
  }
  
  protected getFilterType(): string {
    return 'Contrast'
  }
  
  protected shouldApplyFilter(params: ContrastInput): boolean {
    return params.adjustment !== 0
  }
  
  protected createFilter(params: ContrastInput): unknown {
    const contrastValue = params.adjustment / 100
    return new filters.Contrast({
      contrast: contrastValue
    })
  }
  
  async execute(params: ContrastInput, context: CanvasContext): Promise<ContrastOutput> {
    return this.executeWithCommonPatterns(params, context, async (images) => {
      // Apply contrast filter to images
      await this.applyFilterToImages(images, params, context.canvas)
      
      console.log('[ContrastToolAdapter] Contrast adjustment applied successfully')
      
      return {
        previousValue: 0, // In a real implementation, we'd track the current contrast
        newValue: params.adjustment,
        affectedImages: images.length
      }
    })
  }
}

// Export default instance for auto-discovery
export default ContrastToolAdapter 