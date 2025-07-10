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
  targetingMode: 'selection' | 'all-images'
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
      
      // Activate the sepia tool
      await this.activateTool()
      
      // Set selection snapshot on the tool
      const { useToolStore } = await import('@/store/toolStore')
      const tool = useToolStore.getState().getTool(this.tool.id)
      if (tool && 'setSelectionSnapshot' in tool && typeof tool.setSelectionSnapshot === 'function') {
        tool.setSelectionSnapshot(selectionSnapshot)
      }
      
      try {
        // Update the intensity option
        await this.updateToolOption('intensity', params.intensity)
      } finally {
        // Clear selection snapshot
        if (tool && 'setSelectionSnapshot' in tool && typeof tool.setSelectionSnapshot === 'function') {
          tool.setSelectionSnapshot(null)
        }
      }
      
      return {
        intensity: params.intensity,
        message: params.intensity > 0 
          ? `Applied ${params.intensity}% sepia effect to ${images.length} image(s)`
          : `Removed sepia effect from ${images.length} image(s)`
      }
    })
  }
}

// Export singleton instance
const sepiaAdapter = new SepiaAdapter()
export default sepiaAdapter 