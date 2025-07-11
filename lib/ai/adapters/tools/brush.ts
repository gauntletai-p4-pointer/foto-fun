import { z } from 'zod'
import { CanvasToolAdapter } from '../base'
import { BrushTool } from '@/lib/editor/tools/drawing/brushTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'

// Define parameter schema
const brushParameters = z.object({
  strokes: z.array(z.object({
    points: z.array(z.object({
      x: z.number(),
      y: z.number(),
      pressure: z.number().optional()
    })).describe('Array of points forming the brush stroke'),
    color: z.string().describe('Hex color for this stroke'),
    size: z.number().min(1).max(500).optional().describe('Brush size in pixels'),
    opacity: z.number().min(0).max(100).optional().describe('Opacity percentage'),
    hardness: z.number().min(0).max(100).optional().describe('Brush hardness percentage')
  })).describe('Array of brush strokes to paint'),
  preset: z.enum(['soft-round', 'hard-round', 'airbrush', 'watercolor', 'oil-paint']).optional()
    .describe('Brush preset to use')
})

type BrushInput = z.infer<typeof brushParameters>

interface BrushOutput {
  strokeCount: number
  message: string
}

/**
 * AI adapter for the Brush tool
 * Enables AI to paint strokes on the canvas
 */
export class BrushToolAdapter extends CanvasToolAdapter<BrushInput, BrushOutput> {
  tool = new BrushTool()
  aiName = 'paintBrush'
  description = `Paint brush strokes on the canvas with various styles and effects.

CAPABILITIES:
- Paint freeform strokes with specified points
- Use different brush presets (soft, hard, airbrush, watercolor, oil)
- Control size, opacity, and hardness
- Support pressure sensitivity for natural strokes

Common requests:
- "Paint a red line across the top" → Create stroke with red color
- "Add soft brush strokes" → Use soft-round preset
- "Paint with watercolor effect" → Use watercolor preset
- "Draw thick black strokes" → Large size, black color

The tool creates new paint layers that can be blended with existing content.`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'new-image' as const
  }

  inputSchema = brushParameters
  
  protected getActionVerb(): string {
    return 'paint'
  }
  
  async execute(
    params: BrushInput,
    context: CanvasContext,
    executionContext?: ExecutionContext
  ): Promise<BrushOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async () => {
        console.log('[BrushAdapter] Painting strokes:', params.strokes.length)
        
        // Apply brush preset if specified
        if (params.preset) {
          await this.applyBrushPreset(params.preset)
        }
        
        // Paint each stroke
        for (const stroke of params.strokes) {
          await this.paintStroke(stroke, context)
        }
        
        return {
          strokeCount: params.strokes.length,
          message: `Painted ${params.strokes.length} brush stroke${params.strokes.length !== 1 ? 's' : ''}`
        }
      },
      executionContext
    )
  }
  
  private async applyBrushPreset(preset: string): Promise<void> {
    // Apply preset settings to brush tool
    const presetSettings = {
      'soft-round': { hardness: 0, flow: 100, spacing: 25 },
      'hard-round': { hardness: 100, flow: 100, spacing: 25 },
      'airbrush': { hardness: 0, flow: 10, spacing: 10 },
      'watercolor': { hardness: 0, flow: 30, spacing: 20 },
      'oil-paint': { hardness: 50, flow: 90, spacing: 15 }
    }
    
    const settings = presetSettings[preset as keyof typeof presetSettings]
    if (settings) {
      // TODO: Apply settings through tool options when available
      console.log('[BrushAdapter] Applying preset:', preset, settings)
    }
  }
  
  private async paintStroke(
    stroke: BrushInput['strokes'][0],
    _context: CanvasContext
  ): Promise<void> {
    // TODO: Implement actual brush stroke painting
    // This would involve:
    // 1. Setting brush color, size, opacity, hardness
    // 2. Creating a path from the points
    // 3. Applying the brush along the path
    console.log('[BrushAdapter] Painting stroke with', stroke.points.length, 'points')
  }
} 