import { z } from 'zod'
import { CanvasToolAdapter } from '../base'
import { sepiaTool } from '@/lib/editor/tools/filters/sepiaTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Define parameter schema
const sepiaParameters = z.object({
  enable: z.boolean()
    .describe('Whether to enable sepia effect (true) or disable it (false)')
})

// Define types
type SepiaInput = z.infer<typeof sepiaParameters>

interface SepiaOutput {
  success: boolean
  enabled: boolean
  message: string
  targetingMode: 'selection' | 'all-images'
}

// Create adapter class
export class SepiaAdapter extends CanvasToolAdapter<SepiaInput, SepiaOutput> {
  tool = sepiaTool
  aiName = 'applySepiaEffect'
  description = `Apply sepia (vintage brown) effect to existing images. Simple enable/disable control.

INTELLIGENT TARGETING:
- If you have images selected, only those images will have sepia applied
- If no images are selected, all images on the canvas will have sepia applied

Common sepia requests:
- "sepia" or "vintage look" → enable: true
- "remove sepia" or "restore normal colors" → enable: false`

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
      // Activate the sepia tool
      await this.activateTool()
      
      // Trigger the toggle action
      await this.updateToolOption('action', 'toggle')
      
      return {
        enabled: params.enable,
        message: params.enable 
          ? `Applied sepia effect to ${images.length} image(s)`
          : `Removed sepia effect from ${images.length} image(s)`
      }
    })
  }
}

// Export singleton instance
const sepiaAdapter = new SepiaAdapter()
export default sepiaAdapter 