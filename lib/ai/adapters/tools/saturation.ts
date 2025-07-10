import { z } from 'zod'
import { FilterToolAdapter } from '../base'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import { saturationTool } from '@/lib/editor/tools/adjustments/saturationTool'

// Define parameter schema
const saturationParameters = z.object({
  adjustment: z.number().min(-100).max(100)
    .describe('Saturation adjustment percentage. Negative values reduce saturation, positive values increase saturation. Range: -100 to +100')
})

// Define types
type SaturationInput = z.infer<typeof saturationParameters>

interface SaturationOutput {
  success: boolean
  adjustment: number
  message: string
  targetingMode: 'selection' | 'auto-single' | 'all' | 'none'
}

/**
 * Adapter for the saturation adjustment tool
 * Provides AI-compatible interface for adjusting image saturation
 */
export class SaturationToolAdapter extends FilterToolAdapter<SaturationInput, SaturationOutput> {
  tool = saturationTool
  aiName = 'adjust_saturation'
  description = `Adjust the color saturation of images. 
  
  You MUST calculate the adjustment value based on user intent:
  - "more vibrant" or "more colorful" → +20 to +30
  - "much more vibrant" → +40 to +60
  - "slightly more vibrant" → +10 to +15
  - "less vibrant" or "muted colors" → -20 to -30
  - "much less vibrant" or "desaturated" → -40 to -60
  - "completely desaturated" → -100
  
  NEVER ask for exact values - interpret the user's intent.`
  
  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }
  
  inputSchema = saturationParameters
  
  protected getFilterType(): string {
    return 'saturation'
  }
  
  protected createFilter(params: SaturationInput): Record<string, unknown> {
    return {
      type: 'saturation',
      saturation: params.adjustment / 100 // Convert percentage to decimal
    }
  }
  
  protected shouldApplyFilter(params: SaturationInput): boolean {
    return params.adjustment !== 0
  }
  
  protected getActionVerb(): string {
    return 'adjust saturation'
  }
  
  async execute(
    params: SaturationInput, 
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<SaturationOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async (images, execContext) => {
        console.log(`[SaturationAdapter] Applying saturation adjustment: ${params.adjustment}%`)
        
        // Apply saturation filter to all target images
        await this.applyFilterToImages(images, params, context.canvas, execContext)
        
        return {
          adjustment: params.adjustment,
          message: `Saturation adjusted by ${params.adjustment > 0 ? '+' : ''}${params.adjustment}%`
        }
      },
      executionContext
    )
  }
} 