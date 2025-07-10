import { z } from 'zod'
import { FilterToolAdapter } from '../base'
import { contrastTool } from '@/lib/editor/tools/adjustments/contrastTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import { filters } from 'fabric'

// Define parameter schema
const contrastParameters = z.object({
  adjustment: z.number().min(-100).max(100)
    .describe('Contrast adjustment percentage. Negative values reduce contrast, positive values increase contrast. Range: -100 to +100')
})

// Define types
type ContrastInput = z.infer<typeof contrastParameters>

interface ContrastOutput {
  success: boolean
  adjustment: number
  message: string
  targetingMode: 'selection' | 'auto-single'
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
  
  async execute(params: ContrastInput, context: CanvasContext, executionContext?: ExecutionContext): Promise<ContrastOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async (images, execContext) => {
        // Apply the filter with event emission support
        await this.applyFilterToImages(images, params, context.canvas, execContext)
        
        // Generate descriptive message
        let description = ''
        const magnitude = Math.abs(params.adjustment)
        
        if (params.adjustment > 0) {
          if (magnitude <= 15) {
            description = 'Slightly increased contrast'
          } else if (magnitude <= 35) {
            description = 'Increased contrast'
          } else if (magnitude <= 60) {
            description = 'Significantly increased contrast'
          } else {
            description = 'Dramatically increased contrast'
          }
        } else if (params.adjustment < 0) {
          if (magnitude <= 15) {
            description = 'Slightly reduced contrast'
          } else if (magnitude <= 35) {
            description = 'Reduced contrast'
          } else if (magnitude <= 60) {
            description = 'Significantly reduced contrast'
          } else {
            description = 'Dramatically reduced contrast'
          }
        } else {
          description = 'No contrast change applied'
        }
        
        const message = `${description} on ${images.length} image${images.length !== 1 ? 's' : ''} by ${params.adjustment > 0 ? '+' : ''}${params.adjustment}%`
        
        return {
          adjustment: params.adjustment,
          message
        }
      },
      executionContext
    )
  }
}

// Export singleton instance
const contrastAdapter = new ContrastToolAdapter()
export default contrastAdapter 