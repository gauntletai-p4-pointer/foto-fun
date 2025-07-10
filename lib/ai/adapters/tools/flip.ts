import { z } from 'zod'
import { CanvasToolAdapter } from '../base'
import { flipTool } from '@/lib/editor/tools/transform/flipTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'

// Define parameter schema
const flipParameters = z.object({
  direction: z.enum(['horizontal', 'vertical'])
    .describe('Direction to flip: horizontal (left-right) or vertical (up-down)')
})

// Define types
type FlipInput = z.infer<typeof flipParameters>

interface FlipOutput {
  success: boolean
  direction: 'horizontal' | 'vertical'
  message: string
  targetingMode: 'selection' | 'auto-single' | 'all' | 'none'
}

/**
 * Adapter for the flip tool
 * Provides AI-compatible interface for flipping images
 */
export class FlipToolAdapter extends CanvasToolAdapter<FlipInput, FlipOutput> {
  tool = flipTool
  aiName = 'flip_image'
  description = `Flip images horizontally or vertically.

  You MUST determine the flip direction based on user intent:
  - "flip horizontally" or "mirror" → horizontal
  - "flip vertically" or "upside down" → vertical
  - "flip left to right" → horizontal
  - "flip top to bottom" → vertical
  
  NEVER ask for the direction - interpret the user's intent.`
  
  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }
  
  inputSchema = flipParameters
  
  protected getActionVerb(): string {
    return 'flip'
  }
  
  async execute(
    params: FlipInput, 
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<FlipOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async (images) => {
        console.log(`[FlipAdapter] Flipping ${images.length} images ${params.direction}ly`)
        
        // Apply flip to all target images using CanvasManager
        await context.canvas.flip(params.direction, images)
        
        const directionText = params.direction === 'horizontal' ? 'horizontally' : 'vertically'
        const message = `Flipped ${images.length} image${images.length !== 1 ? 's' : ''} ${directionText}`
        
        return {
          direction: params.direction,
          message
        }
      },
      executionContext
    )
  }
} 