import { z } from 'zod'
import { CanvasToolAdapter } from '../base'
import { GradientTool } from '@/lib/editor/tools/drawing/gradientTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'

// Define parameter schema
const gradientParameters = z.object({
  type: z.enum(['linear', 'radial', 'angle', 'reflected', 'diamond'])
    .describe('Type of gradient'),
  startPoint: z.object({
    x: z.number(),
    y: z.number()
  }).describe('Starting point of the gradient'),
  endPoint: z.object({
    x: z.number(),
    y: z.number()
  }).describe('Ending point of the gradient'),
  colors: z.array(z.object({
    color: z.string().describe('Hex color value'),
    position: z.number().min(0).max(1).describe('Position in gradient (0-1)')
  })).min(2).describe('Gradient color stops'),
  opacity: z.number().min(0).max(100).optional().describe('Overall gradient opacity'),
  blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay']).optional()
    .describe('Blend mode for the gradient')
})

type GradientInput = z.infer<typeof gradientParameters>

interface GradientOutput {
  type: string
  colorCount: number
  message: string
}

/**
 * AI adapter for the Gradient tool
 * Enables AI to create gradient fills on the canvas
 */
export class GradientToolAdapter extends CanvasToolAdapter<GradientInput, GradientOutput> {
  tool = new GradientTool()
  aiName = 'createGradient'
  description = `Create gradient fills with various styles and color transitions.

GRADIENT TYPES:
- linear: Straight gradient from start to end
- radial: Circular gradient from center outward
- angle: Conical gradient rotating around center
- reflected: Linear gradient that reflects from center
- diamond: Diamond-shaped gradient from center

Common requests:
- "Add sunset gradient" → Linear gradient with warm colors
- "Create radial glow" → Radial gradient with light center
- "Rainbow gradient" → Linear with multiple color stops
- "Fade to transparent" → Gradient with alpha channel

The gradient is applied as a new layer or fill.`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'new-image' as const
  }

  inputSchema = gradientParameters
  
  protected getActionVerb(): string {
    return 'create gradient'
  }
  
  async execute(
    params: GradientInput,
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<GradientOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async () => {
        console.log('[GradientAdapter] Creating gradient:', params.type)
        
        // Create and apply the gradient
        await this.createGradient(params)
        
        return {
          type: params.type,
          colorCount: params.colors.length,
          message: `Created ${params.type} gradient with ${params.colors.length} colors`
        }
      },
      executionContext
    )
  }
  
  private async createGradient(
    params: GradientInput
  ): Promise<void> {
    // TODO: Implement gradient creation
    // This would involve:
    // 1. Creating gradient definition based on type
    // 2. Setting color stops
    // 3. Applying gradient as fill or new layer
    console.log('[GradientAdapter] Creating gradient from', params.startPoint, 'to', params.endPoint)
    console.log('[GradientAdapter] Colors:', params.colors)
  }
} 