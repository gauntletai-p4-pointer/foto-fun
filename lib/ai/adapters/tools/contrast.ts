import { z } from 'zod'
import { FilterToolAdapter } from '../base'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import type { Filter } from '@/lib/editor/canvas/types'
import { contrastTool } from '@/lib/editor/tools/adjustments/contrastTool'

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
  targetingMode: 'selection' | 'auto-single' | 'all' | 'none'
}

/**
 * Adapter for the contrast adjustment tool
 * Provides AI-compatible interface for adjusting image contrast
 */
export class ContrastToolAdapter extends FilterToolAdapter<ContrastInput, ContrastOutput> {
  tool = contrastTool
  aiName = 'adjust_contrast'
  description = `Adjust the contrast of images. 
  
  You MUST calculate the adjustment value based on user intent:
  - "more contrast" or "higher contrast" → +20 to +30
  - "much more contrast" → +40 to +60
  - "slightly more contrast" → +10 to +15
  - "less contrast" or "lower contrast" → -20 to -30
  - "much less contrast" → -40 to -60
  - "slightly less contrast" → -10 to -15
  
  NEVER ask for exact values - interpret the user's intent.`
  
  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }
  
  inputSchema = contrastParameters
  
  protected getFilterType(): string {
    return 'contrast'
  }
  
  protected createFilter(params: ContrastInput): Filter {
    return {
      type: 'contrast',
      params: { value: params.adjustment }
    }
  }
  
  protected shouldApplyFilter(params: ContrastInput): boolean {
    return params.adjustment !== 0
  }
  
  protected getActionVerb(): string {
    return 'adjust contrast'
  }
  
  async execute(
    params: ContrastInput, 
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<ContrastOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async (images, execContext) => {
        console.log(`[ContrastAdapter] Applying contrast adjustment: ${params.adjustment}%`)
        
        // Apply contrast filter to all target images
        await this.applyFilterToImages(images, params, context.canvas, execContext)
        
        return {
          adjustment: params.adjustment,
          message: `Contrast adjusted by ${params.adjustment > 0 ? '+' : ''}${params.adjustment}%`
        }
      },
      executionContext
    )
  }
} 