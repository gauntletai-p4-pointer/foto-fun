import { z } from 'zod'
import { FilterToolAdapter } from '../base'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import { grayscaleTool } from '@/lib/editor/tools/filters/grayscaleTool'

// Define parameter schema
const grayscaleParameters = z.object({
  enabled: z.boolean().describe('Whether to apply grayscale effect. true = convert to grayscale, false = remove grayscale')
})

// Define types
type GrayscaleInput = z.infer<typeof grayscaleParameters>

interface GrayscaleOutput {
  success: boolean
  enabled: boolean
  message: string
  targetingMode: 'selection' | 'auto-single' | 'all' | 'none'
}

/**
 * Adapter for the grayscale filter tool
 * Provides AI-compatible interface for converting images to grayscale
 */
export class GrayscaleToolAdapter extends FilterToolAdapter<GrayscaleInput, GrayscaleOutput> {
  tool = grayscaleTool
  aiName = 'apply_grayscale'
  description = `Convert images to grayscale (black and white) or remove grayscale effect.
  
  Common requests:
  - "make it black and white" → enabled: true
  - "convert to grayscale" → enabled: true
  - "remove color" → enabled: true
  - "restore color" → enabled: false
  - "remove grayscale" → enabled: false
  
  NEVER ask the user - determine from their intent.`
  
  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }
  
  inputSchema = grayscaleParameters
  
  protected getFilterType(): string {
    return 'grayscale'
  }
  
  protected createFilter(params: GrayscaleInput): any {
    return {
      type: 'grayscale'
    }
  }
  
  protected shouldApplyFilter(params: GrayscaleInput): boolean {
    return params.enabled
  }
  
  protected getActionVerb(): string {
    return 'apply grayscale'
  }
  
  async execute(
    params: GrayscaleInput, 
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<GrayscaleOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async (images, execContext) => {
        console.log(`[GrayscaleAdapter] ${params.enabled ? 'Applying' : 'Removing'} grayscale effect`)
        
        // Apply or remove grayscale filter
        await this.applyFilterToImages(images, params, context.canvas, execContext)
        
        const message = params.enabled 
          ? 'Image converted to grayscale'
          : 'Grayscale effect removed'
        
        return {
          enabled: params.enabled,
          message
        }
      },
      executionContext
    )
  }
} 