import { z } from 'zod'
import { CanvasToolAdapter } from '../base'
import { rotateTool } from '@/lib/editor/tools/transform/rotateTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'

// Define parameter schema
const rotateParameters = z.object({
  angle: z.number().min(-360).max(360)
    .describe('Rotation angle in degrees. Positive values rotate clockwise, negative values rotate counter-clockwise')
})

// Define types
type RotateInput = z.infer<typeof rotateParameters>

interface RotateOutput {
  success: boolean
  angle: number
  message: string
  targetingMode: 'selection' | 'auto-single' | 'all' | 'none'
}

/**
 * Adapter for the rotate tool
 * Provides AI-compatible interface for rotating images
 */
export class RotateToolAdapter extends CanvasToolAdapter<RotateInput, RotateOutput> {
  tool = rotateTool
  aiName = 'rotate_image'
  description = `Rotate images by a specific angle.

  You MUST calculate the rotation angle based on user intent:
  - "rotate 90 degrees" → 90
  - "rotate clockwise" → 90
  - "rotate counter-clockwise" → -90
  - "rotate 180 degrees" or "turn upside down" → 180
  - "rotate 45 degrees" → 45
  - "slight rotation" → 15 to 30
  - "quarter turn" → 90
  - "half turn" → 180
  
  NEVER ask for exact angles - interpret the user's intent.`
  
  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }
  
  inputSchema = rotateParameters
  
  protected getActionVerb(): string {
    return 'rotate'
  }
  
  async execute(
    params: RotateInput, 
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<RotateOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async (images) => {
        console.log(`[RotateAdapter] Rotating ${images.length} images by ${params.angle} degrees`)
        
        // Apply rotation to all target images using CanvasManager
        await context.canvas.rotate(params.angle, images)
        
        const directionText = params.angle > 0 ? 'clockwise' : 'counter-clockwise'
        const message = `Rotated ${images.length} image${images.length !== 1 ? 's' : ''} by ${Math.abs(params.angle)}° ${directionText}`
        
        return {
          angle: params.angle,
          message
        }
      },
      executionContext
    )
  }
} 