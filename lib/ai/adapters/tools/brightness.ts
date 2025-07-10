import { z } from 'zod'
import { FilterToolAdapter } from '../base'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import type { Filter } from '@/lib/editor/canvas/types'
import { brightnessTool } from '@/lib/editor/tools/adjustments/brightnessTool'

// Define parameter schema
const brightnessParameters = z.object({
  adjustment: z.number().min(-100).max(100)
    .describe('Brightness adjustment percentage. Negative values darken, positive values brighten. Range: -100 to +100')
})

// Define types
type BrightnessInput = z.infer<typeof brightnessParameters>

interface BrightnessOutput {
  success: boolean
  adjustment: number
  message: string
  targetingMode: 'selection' | 'auto-single' | 'all' | 'none'
}

/**
 * Adapter for the brightness adjustment tool
 * Provides AI-compatible interface for adjusting image brightness
 */
export class BrightnessToolAdapter extends FilterToolAdapter<BrightnessInput, BrightnessOutput> {
  tool = brightnessTool
  aiName = 'adjust_brightness'
  description = `Adjust the brightness of images. 
  
  You MUST calculate the adjustment value based on user intent:
  - "brighter" or "lighter" → +20 to +30
  - "much brighter" → +40 to +60
  - "slightly brighter" → +10 to +15
  - "darker" → -20 to -30
  - "much darker" → -40 to -60
  - "slightly darker" → -10 to -15
  
  NEVER ask for exact values - interpret the user's intent.`
  
  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }
  
  inputSchema = brightnessParameters
  
  protected getFilterType(): string {
    return 'brightness'
  }
  
  protected createFilter(params: BrightnessInput): Record<string, unknown> {
    return {
      type: 'brightness',
      brightness: params.adjustment / 100 // Convert percentage to decimal
    }
  }
  
  protected shouldApplyFilter(params: BrightnessInput): boolean {
    return params.adjustment !== 0
  }
  
  protected getActionVerb(): string {
    return 'adjust brightness'
  }
  
  async execute(
    params: BrightnessInput, 
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<BrightnessOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async (images, execContext) => {
        console.log(`[BrightnessAdapter] Applying brightness adjustment: ${params.adjustment}%`)
        
        // Apply brightness filter to all target images
        await this.applyFilterToImages(images, params, context.canvas, execContext)
        
        return {
          adjustment: params.adjustment,
          message: `Brightness adjusted by ${params.adjustment > 0 ? '+' : ''}${params.adjustment}%`
        }
      },
      executionContext
    )
  }
} 