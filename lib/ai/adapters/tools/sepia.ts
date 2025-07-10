import { z } from 'zod'
import { CanvasToolAdapter } from '../base'
import { sepiaTool } from '@/lib/editor/tools/filters/sepiaTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Define parameter schema
const sepiaParameters = z.object({
  intensity: z.number()
    .min(0)
    .max(100)
    .describe('Sepia intensity from 0 (no effect) to 100 (full sepia)')
})

// Define types
type SepiaInput = z.infer<typeof sepiaParameters>

interface SepiaOutput {
  success: boolean
  intensity: number
  message: string
  targetingMode: 'selection' | 'auto-single'
}

// Create adapter class
export class SepiaAdapter extends CanvasToolAdapter<SepiaInput, SepiaOutput> {
  tool = sepiaTool
  aiName = 'applySepiaEffect'
  description = `Apply sepia (vintage brown) effect to existing images. You MUST calculate the intensity based on user intent.

INTELLIGENT TARGETING:
- If you have images selected, only those images will have sepia applied
- If no images are selected, all images on the canvas will have sepia applied

Common sepia requests:
- "sepia" or "vintage look" → intensity: 80
- "strong sepia" or "heavy vintage" → intensity: 100
- "subtle sepia" or "slight vintage" → intensity: 50
- "remove sepia" → intensity: 0

NEVER ask for exact values - interpret the user's intent.
Range: 0 (no effect) to 100 (full sepia)`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = sepiaParameters
  
  protected getActionVerb(): string {
    return 'apply sepia effect'
  }
  
  async execute(params: SepiaInput, context: CanvasContext): Promise<SepiaOutput> {
    return this.executeWithCommonPatterns(params, context, async (images) => {
      // Create a selection snapshot from the target images
      const { SelectionSnapshotFactory } = await import('@/lib/ai/execution/SelectionSnapshot')
      const selectionSnapshot = SelectionSnapshotFactory.fromObjects(images)
      
      // Tool activation and option updates are handled by applyToolOperation
      
      // Apply the sepia filter using the base class helper with selection snapshot
      await this.applyToolOperation(this.tool.id, 'intensity', params.intensity, context.canvas, selectionSnapshot)
      
      // Generate descriptive message
      let description = ''
      
      if (params.intensity === 0) {
        description = 'Removed sepia effect'
      } else if (params.intensity <= 25) {
        description = 'Applied subtle vintage sepia tone'
      } else if (params.intensity <= 50) {
        description = 'Applied moderate sepia effect'
      } else if (params.intensity <= 75) {
        description = 'Applied strong antique sepia tone'
      } else {
        description = 'Applied full vintage sepia effect'
      }
      
      const message = `${description} (${params.intensity}% intensity) to ${images.length} image${images.length !== 1 ? 's' : ''}`
      
      return {
        intensity: params.intensity,
        message
      }
    })
  }
}

// Export singleton instance
const sepiaAdapter = new SepiaAdapter()
export default sepiaAdapter 