import { z } from 'zod'
import { FilterToolAdapter } from '../base'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import type { Filter } from '@/lib/editor/canvas/types'
import { blurTool } from '@/lib/editor/tools/filters/blurTool'

// Define parameter schema
const blurParameters = z.object({
  radius: z.number().min(0).max(50)
    .describe('Blur radius in pixels. 0 = no blur, higher values = more blur. Range: 0 to 50')
})

// Define types
type BlurInput = z.infer<typeof blurParameters>

interface BlurOutput {
  success: boolean
  radius: number
  message: string
  targetingMode: 'selection' | 'auto-single' | 'all' | 'none'
}

/**
 * Adapter for the blur filter tool
 * Provides AI-compatible interface for applying blur effects
 */
export class BlurToolAdapter extends FilterToolAdapter<BlurInput, BlurOutput> {
  tool = blurTool
  aiName = 'apply_blur'
  description = `Apply blur effect to images. 
  
  You MUST calculate the blur radius based on user intent:
  - "slight blur" or "soft blur" → 2 to 5 pixels
  - "blur" or "medium blur" → 8 to 15 pixels
  - "heavy blur" or "strong blur" → 20 to 35 pixels
  - "extreme blur" → 40 to 50 pixels
  - "remove blur" or "no blur" → 0 pixels
  
  NEVER ask for exact values - interpret the user's intent.`
  
  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }
  
  inputSchema = blurParameters
  
  protected getFilterType(): string {
    return 'blur'
  }
  
  protected createFilter(params: BlurInput): Filter {
    return {
      type: 'blur',
      params: { radius: params.radius }
    }
  }
  
  protected shouldApplyFilter(params: BlurInput): boolean {
    return params.radius > 0
  }
  
  protected getActionVerb(): string {
    return 'apply blur'
  }
  
  async execute(
    params: BlurInput, 
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<BlurOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async (images, execContext) => {
        console.log(`[BlurAdapter] Applying blur with radius: ${params.radius}px`)
        
        // Apply blur filter to all target images
        await this.applyFilterToImages(images, params, context.canvas, execContext)
        
        const message = params.radius === 0 
          ? 'Blur effect removed'
          : `Blur applied with ${params.radius}px radius`
        
        return {
          radius: params.radius,
          message
        }
      },
      executionContext
    )
  }
} 