import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { sepiaTool } from '@/lib/editor/tools/filters/sepiaTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Define parameter schema
const sepiaParameters = z.object({
  intensity: z.number().min(0).max(100)
    .describe('Sepia effect intensity as a percentage (0-100). 0 = no sepia, 100 = full sepia')
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
export class SepiaAdapter extends BaseToolAdapter<SepiaInput, SepiaOutput> {
  tool = sepiaTool
  aiName = 'applySepiaEffect'
  description = `Apply sepia (vintage brown) effect to existing images. You MUST calculate the intensity based on user intent.

INTELLIGENT TARGETING:
- If you have images selected, only those images will have sepia applied
- If no images are selected, all images on the canvas will have sepia applied

Common sepia requests:
- "sepia" or "vintage look" → intensity: 0.8
- "strong sepia" or "heavy vintage" → intensity: 1.0
- "subtle sepia" or "slight vintage" → intensity: 0.5
- "remove sepia" → intensity: 0

NEVER ask for exact values - interpret the user's intent.
Range: 0 (no effect) to 1 (full sepia)`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = sepiaParameters
  
  async execute(params: SepiaInput, context: CanvasContext): Promise<SepiaOutput> {
    try {
      console.log('[SepiaAdapter] Execute called with params:', params)
      console.log('[SepiaAdapter] Targeting mode:', context.targetingMode)
      
      // Use pre-filtered target images from enhanced context
      const images = context.targetImages
      
      console.log('[SepiaAdapter] Target images:', images.length)
      console.log('[SepiaAdapter] Targeting mode:', context.targetingMode)
      
      if (images.length === 0) {
        throw new Error('No images found to apply sepia. Please load an image or select images first.')
      }
      
      // Activate the sepia tool first
      const { useToolStore } = await import('@/store/toolStore')
      useToolStore.getState().setActiveTool(this.tool.id)
      
      // Small delay to ensure tool is activated and subscribed
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Get the sepia tool options and update them
      const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
      useToolOptionsStore.getState().updateOption(this.tool.id, 'intensity', params.intensity)
      
      return {
        success: true,
        intensity: params.intensity,
        message: params.intensity > 0 
          ? `Applied ${params.intensity}% sepia effect to ${images.length} image(s)`
          : `Removed sepia effect from ${images.length} image(s)`,
        targetingMode: context.targetingMode
      }
    } catch (error) {
      return {
        success: false,
        intensity: 0,
        message: error instanceof Error ? error.message : 'Failed to apply sepia effect',
        targetingMode: context.targetingMode
      }
    }
  }
}

// Export singleton instance
const sepiaAdapter = new SepiaAdapter()
export default sepiaAdapter 