import { z } from 'zod'
import { CanvasToolAdapter } from '../base'
import { EraserTool } from '@/lib/editor/tools/drawing/eraserTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'

// Define parameter schema
const eraserParameters = z.object({
  strokes: z.array(z.object({
    points: z.array(z.object({
      x: z.number(),
      y: z.number(),
      pressure: z.number().optional()
    })).describe('Array of points forming the eraser stroke'),
    size: z.number().min(1).max(500).optional().describe('Eraser size in pixels')
  })).describe('Array of eraser strokes'),
  mode: z.enum(['brush', 'pencil', 'block', 'background']).optional()
    .describe('Eraser mode - background mode removes similar colors'),
  tolerance: z.number().min(0).max(255).optional()
    .describe('Tolerance for background eraser mode')
})

type EraserInput = z.infer<typeof eraserParameters>

interface EraserOutput {
  strokeCount: number
  mode: string
  message: string
}

/**
 * AI adapter for the Eraser tool
 * Enables AI to erase parts of the canvas
 */
export class EraserToolAdapter extends CanvasToolAdapter<EraserInput, EraserOutput> {
  tool = new EraserTool()
  aiName = 'eraser'
  description = `Erase parts of images or remove backgrounds intelligently.

CAPABILITIES:
- Erase with different modes (brush, pencil, block, background)
- Background eraser removes similar colors based on tolerance
- Support pressure sensitivity for natural erasing
- Variable eraser sizes

Common requests:
- "Erase the background" → Use background mode with appropriate tolerance
- "Remove this area" → Use brush mode with strokes
- "Clean up edges" → Use pencil mode for precision
- "Erase large area" → Use block mode or large brush

The eraser works on the current layer or selection.`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = eraserParameters
  
  protected getActionVerb(): string {
    return 'erase'
  }
  
  async execute(
    params: EraserInput,
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<EraserOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async () => {
        const mode = params.mode || 'brush'
        console.log('[EraserAdapter] Erasing with mode:', mode)
        
        // Set eraser mode
        await this.setEraserMode(mode, params.tolerance)
        
        // Apply each eraser stroke
        for (const stroke of params.strokes) {
          await this.eraseStroke(stroke)
        }
        
        return {
          strokeCount: params.strokes.length,
          mode,
          message: `Erased ${params.strokes.length} stroke${params.strokes.length !== 1 ? 's' : ''} using ${mode} mode`
        }
      },
      executionContext
    )
  }
  
  private async setEraserMode(mode: string, tolerance?: number): Promise<void> {
    // TODO: Set eraser mode through tool options
    console.log('[EraserAdapter] Setting mode:', mode, 'tolerance:', tolerance)
  }
  
  private async eraseStroke(
    stroke: EraserInput['strokes'][0]
  ): Promise<void> {
    // TODO: Implement actual eraser stroke
    // This would involve:
    // 1. Setting eraser size
    // 2. Creating a path from the points
    // 3. Applying the eraser along the path
    console.log('[EraserAdapter] Erasing stroke with', stroke.points.length, 'points')
  }
} 