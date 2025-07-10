import { z } from 'zod'
import { CanvasToolAdapter } from '../base'
import { grayscaleTool } from '@/lib/editor/tools/filters/grayscaleTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Define parameter schema
const grayscaleParameters = z.object({
  enable: z.boolean()
    .describe('Whether to enable grayscale (true) or disable it (false)')
})

// Define types
type GrayscaleInput = z.infer<typeof grayscaleParameters>

interface GrayscaleOutput {
  success: boolean
  enabled: boolean
  message: string
  targetingMode: 'selection' | 'all-images' | 'auto-single'
}

// Create adapter class
export class GrayscaleAdapter extends CanvasToolAdapter<GrayscaleInput, GrayscaleOutput> {
  tool = grayscaleTool
  aiName = 'convertToGrayscale'
  description = `Convert existing images to grayscale (black and white). Simple enable/disable control.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be converted
- If no images are selected, all images on the canvas will be converted

Common grayscale requests:
- "make it grayscale" or "black and white" → enable: true
- "remove grayscale" or "restore color" → enable: false`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = grayscaleParameters
  
  protected getActionVerb(): string {
    return 'convert to grayscale'
  }
  
  async execute(params: GrayscaleInput, context: CanvasContext): Promise<GrayscaleOutput> {
    return this.executeWithCommonPatterns(params, context, async (images) => {
      // Create a selection snapshot from the target images
      const { SelectionSnapshotFactory } = await import('@/lib/ai/execution/SelectionSnapshot')
      const selectionSnapshot = SelectionSnapshotFactory.fromObjects(images)
      
      // Apply the grayscale using the base class helper with selection snapshot
      await this.applyToolOperation(this.tool.id, 'action', 'toggle', context.canvas, selectionSnapshot)
      
      // Generate descriptive message
      const description = params.enable
        ? 'Converted to black and white'
        : 'Restored original colors'
      
      const message = `${description} for ${images.length} image${images.length !== 1 ? 's' : ''}`
      
      return {
        success: true,
        enabled: params.enable,
        message,
        targetingMode: context.targetingMode
      }
    })
  }
}

// Export singleton instance
const grayscaleAdapter = new GrayscaleAdapter()
export default grayscaleAdapter 