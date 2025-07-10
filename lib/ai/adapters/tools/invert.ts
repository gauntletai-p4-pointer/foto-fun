import { z } from 'zod'
import { FilterToolAdapter } from '../base'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import { invertTool } from '@/lib/editor/tools/filters/invertTool'

// Define parameter schema
const invertParameters = z.object({
  enabled: z.boolean().describe('Whether to apply invert effect. true = invert colors, false = restore original colors')
})

// Define types
type InvertInput = z.infer<typeof invertParameters>

interface InvertOutput {
  success: boolean
  enabled: boolean
  message: string
  targetingMode: 'selection' | 'auto-single' | 'all' | 'none'
}

/**
 * Adapter for the invert filter tool
 * Provides AI-compatible interface for inverting image colors
 */
export class InvertToolAdapter extends FilterToolAdapter<InvertInput, InvertOutput> {
  tool = invertTool
  aiName = 'invert_colors'
  description = `Invert the colors of images (create negative effect) or restore original colors.
  
  Common requests:
  - "invert colors" → enabled: true
  - "make negative" → enabled: true
  - "create negative effect" → enabled: true
  - "restore colors" → enabled: false
  - "remove invert" → enabled: false
  
  NEVER ask the user - determine from their intent.`
  
  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }
  
  inputSchema = invertParameters
  
  protected getFilterType(): string {
    return 'invert'
  }
  
  protected createFilter(): Record<string, unknown> {
    return {
      type: 'invert'
    }
  }
  
  protected shouldApplyFilter(params: InvertInput): boolean {
    return params.enabled
  }
  
  protected getActionVerb(): string {
    return 'invert colors'
  }
  
  async execute(
    params: InvertInput, 
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<InvertOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async (images, execContext) => {
        console.log(`[InvertAdapter] ${params.enabled ? 'Applying' : 'Removing'} color inversion`)
        
        // Apply or remove invert filter
        await this.applyFilterToImages(images, params, context.canvas, execContext)
        
        const message = params.enabled 
          ? 'Colors inverted (negative effect applied)'
          : 'Color inversion removed'
        
        return {
          enabled: params.enabled,
          message
        }
      },
      executionContext
    )
  }
} 