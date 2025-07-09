import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { sharpenTool } from '@/lib/editor/tools/filters/sharpenTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Define parameter schema
const sharpenParameters = z.object({
  amount: z.number().min(0).max(100)
    .describe('Sharpen intensity as a percentage (0-100). 0 = no sharpening, 100 = maximum sharpening')
})

// Define types
type SharpenInput = z.infer<typeof sharpenParameters>

interface SharpenOutput {
  success: boolean
  amount: number
  message: string
  targetingMode: 'selection' | 'all-images'
}

// Create adapter class
export class SharpenAdapter extends BaseToolAdapter<SharpenInput, SharpenOutput> {
  tool = sharpenTool
  aiName = 'sharpenImage'
  description = `Sharpen existing images to make them appear more crisp and detailed. You MUST calculate the amount based on user intent.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be sharpened
- If no images are selected, all images on the canvas will be sharpened

Common sharpen requests:
- "sharpen" or "make it crisp" → amount: 15-25
- "heavy sharpen" or "very sharp" → amount: 30-40
- "subtle sharpen" or "slight sharpening" → amount: 5-10
- "remove sharpening" → amount: 0

NEVER ask for exact values - interpret the user's intent.
Range: 0 (no sharpening) to 50 (maximum sharpening)`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = sharpenParameters
  
  async execute(params: SharpenInput, context: CanvasContext): Promise<SharpenOutput> {
    try {
      console.log('[SharpenAdapter] Execute called with params:', params)
      console.log('[SharpenAdapter] Targeting mode:', context.targetingMode)
      
      // Use pre-filtered target images from enhanced context
      const images = context.targetImages
      
      console.log('[SharpenAdapter] Target images:', images.length)
      console.log('[SharpenAdapter] Targeting mode:', context.targetingMode)
      
      if (images.length === 0) {
        throw new Error('No images found to sharpen. Please load an image or select images first.')
      }
      
      // Activate the sharpen tool first
      const { useToolStore } = await import('@/store/toolStore')
      useToolStore.getState().setActiveTool(this.tool.id)
      
      // Small delay to ensure tool is activated and subscribed
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Get the sharpen tool options and update them
      const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
      useToolOptionsStore.getState().updateOption(this.tool.id, 'sharpen', params.amount)
      
      return {
        success: true,
        amount: params.amount,
        message: params.amount > 0 
          ? `Applied ${params.amount}% sharpening to ${images.length} image(s)`
          : `Removed sharpening from ${images.length} image(s)`,
        targetingMode: context.targetingMode
      }
    } catch (error) {
      return {
        success: false,
        amount: 0,
        message: error instanceof Error ? error.message : 'Failed to apply sharpening',
        targetingMode: context.targetingMode
      }
    }
  }
}

// Export singleton instance
const sharpenAdapter = new SharpenAdapter()
export default sharpenAdapter 