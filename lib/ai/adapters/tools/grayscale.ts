import { z } from 'zod'
import { BaseToolAdapter } from '../base'
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
export class GrayscaleAdapter extends BaseToolAdapter<GrayscaleInput, GrayscaleOutput> {
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
  
  async execute(params: GrayscaleInput, context: CanvasContext): Promise<GrayscaleOutput> {
    try {
      console.log('[GrayscaleAdapter] Execute called with params:', params)
      console.log('[GrayscaleAdapter] Targeting mode:', context.targetingMode)
      
      // Use pre-filtered target images from enhanced context
      const images = context.targetImages
      
      console.log('[GrayscaleAdapter] Target images:', images.length)
      console.log('[GrayscaleAdapter] Targeting mode:', context.targetingMode)
      
      if (images.length === 0) {
        throw new Error('No images found to convert. Please load an image or select images first.')
      }
      
      // Activate the grayscale tool first
      const { useToolStore } = await import('@/store/toolStore')
      useToolStore.getState().setActiveTool(this.tool.id)
      
      // Small delay to ensure tool is activated and subscribed
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Trigger the toggle action
      const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
      useToolOptionsStore.getState().updateOption(this.tool.id, 'action', 'toggle')
      
      return {
        success: true,
        enabled: params.enable,
        message: params.enable 
          ? `Converted ${images.length} image(s) to grayscale`
          : `Restored color to ${images.length} image(s)`,
        targetingMode: context.targetingMode
      }
    } catch (error) {
      return {
        success: false,
        enabled: false,
        message: error instanceof Error ? error.message : 'Failed to apply grayscale',
        targetingMode: context.targetingMode
      }
    }
  }
}

// Export singleton instance
const grayscaleAdapter = new GrayscaleAdapter()
export default grayscaleAdapter 