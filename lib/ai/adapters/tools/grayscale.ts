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
  targetingMode: 'selection' | 'all-images'
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
      // Activate the grayscale tool
      await this.activateTool()
      
      // Trigger the toggle action
      await this.updateToolOption('action', 'toggle')
      
      return {
        enabled: params.enable,
        message: params.enable 
          ? `Converted ${images.length} image(s) to grayscale`
          : `Restored color to ${images.length} image(s)`
      }
    })
  }
}

// Export singleton instance
const grayscaleAdapter = new GrayscaleAdapter()
export default grayscaleAdapter 