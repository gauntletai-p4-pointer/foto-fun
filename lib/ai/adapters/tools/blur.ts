import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { blurTool } from '@/lib/editor/tools/filters/blurTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Define parameter schema
const blurParameters = z.object({
  amount: z.number().min(0).max(100)
    .describe('Blur intensity as a percentage (0-100). 0 = no blur, 100 = maximum blur')
})

// Define types
type BlurInput = z.infer<typeof blurParameters>

interface BlurOutput {
  success: boolean
  amount: number
  message: string
  targetingMode: 'selection' | 'all-images' | 'auto-single'
}

// Create adapter class
export class BlurAdapter extends BaseToolAdapter<BlurInput, BlurOutput> {
  tool = blurTool
  aiName = 'blurImage'
  description = `Apply blur effect to existing images on the canvas. You MUST calculate the blur amount based on user intent.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be blurred
- If no images are selected, all images on the canvas will be blurred

Common blur requests:
- "blur" or "soft blur" → 5-10
- "heavy blur" or "strong blur" → 15-25
- "slight blur" or "subtle blur" → 2-5
- "gaussian blur" → 8-12
- "motion blur effect" → 10-15

NEVER ask for exact values - interpret the user's intent and calculate appropriate blur amounts.
Range: 0 (no blur) to 50 (maximum blur)`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = blurParameters
  
  async execute(params: BlurInput, context: CanvasContext): Promise<BlurOutput> {
    try {
      console.log('[BlurAdapter] Execute called with params:', params)
      console.log('[BlurAdapter] Targeting mode:', context.targetingMode)
      
      // Use pre-filtered target images from enhanced context
      const images = context.targetImages
      
      console.log('[BlurAdapter] Target images:', images.length)
      console.log('[BlurAdapter] Targeting mode:', context.targetingMode)
      
      if (images.length === 0) {
        throw new Error('No images found to blur. Please load an image or select images first.')
      }
      
      // Create a selection snapshot from the target images
      const { SelectionSnapshotFactory } = await import('@/lib/ai/execution/SelectionSnapshot')
      const selectionSnapshot = SelectionSnapshotFactory.fromObjects(images)
      
      // Apply the blur using the base class helper with selection snapshot
      await this.applyToolOperation(this.tool.id, 'amount', params.amount, context.canvas, selectionSnapshot)
      
      // Generate descriptive message
      let description = ''
      
      if (params.amount === 0) {
        description = 'Removed blur effect'
      } else if (params.amount <= 20) {
        description = 'Applied subtle blur'
      } else if (params.amount <= 40) {
        description = 'Applied moderate blur'
      } else if (params.amount <= 70) {
        description = 'Applied strong blur'
      } else {
        description = 'Applied heavy blur'
      }
      
      const message = `${description} (${params.amount}% intensity) to ${images.length} image${images.length !== 1 ? 's' : ''}`
      
      return {
        success: true,
        amount: params.amount,
        message,
        targetingMode: context.targetingMode
      }
    } catch (error) {
      return {
        success: false,
        amount: 0,
        message: error instanceof Error ? error.message : 'Failed to apply blur',
        targetingMode: context.targetingMode
      }
    }
  }
}

// Export singleton instance
const blurAdapter = new BlurAdapter()
export default blurAdapter 