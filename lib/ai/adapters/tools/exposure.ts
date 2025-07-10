import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { exposureTool } from '@/lib/editor/tools/adjustments/exposureTool'
import type { Canvas } from 'fabric'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Define parameter schema
const exposureParameters = z.object({
  adjustment: z.number()
    .min(-100)
    .max(100)
    .describe('Exposure adjustment from -100 (darkest) to 100 (brightest)')
})

type ExposureInput = z.infer<typeof exposureParameters>

// Define output type
interface ExposureOutput {
  success: boolean
  adjustment: number
  affectedImages: number
  message: string
  targetingMode: 'selection' | 'all-images'
}

// Create adapter class
export class ExposureToolAdapter extends BaseToolAdapter<ExposureInput, ExposureOutput> {
  tool = exposureTool
  aiName = 'adjustExposure'
  description = `Adjust the exposure of existing images (simulates camera exposure compensation).

INTELLIGENT TARGETING:
- If you have images selected, only those images will be adjusted
- If no images are selected, all images on the canvas will be adjusted

You MUST calculate the adjustment value based on user intent:
- "increase exposure" or "overexpose" → +30 to +50
- "decrease exposure" or "underexpose" → -30 to -50
- "slightly overexposed" → +15 to +25
- "slightly underexposed" → -15 to -25
- "blown out" or "very overexposed" → +60 to +80
- "very dark" or "very underexposed" → -60 to -80
- "fix overexposure" → -30 to -50
- "fix underexposure" → +30 to +50
- "neutral exposure" → 0
- "adjust exposure by X stops" → X * 33 (each stop ≈ 33 units)
- "turn exposure down by X%" → use -X directly (e.g., "down by 10%" → -10)
- "turn exposure up by X%" → use +X directly (e.g., "up by 15%" → +15)
- "increase exposure X%" → use +X directly 
- "decrease exposure X%" → use -X directly
- "reduce exposure X%" → use -X directly

Note: Exposure has a more dramatic effect than brightness, affecting the entire tonal range.
NEVER ask for exact values - always interpret the user's intent and choose an appropriate value.
Range: -100 (very dark) to +100 (very bright)`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = exposureParameters
  
  async execute(params: ExposureInput, context: CanvasContext): Promise<ExposureOutput> {
    console.log('[ExposureToolAdapter] ===== EXECUTE CALLED =====')
    console.log('[ExposureToolAdapter] Execute called with params:', params)
    console.log('[ExposureToolAdapter] Adjustment value:', params.adjustment)
    console.log('[ExposureToolAdapter] Targeting mode:', context.targetingMode)
    
    // Use pre-filtered target images from enhanced context
    const images = context.targetImages
    
    console.log('[ExposureToolAdapter] Target images:', images.length)
    console.log('[ExposureToolAdapter] Targeting mode:', context.targetingMode)
    
    if (images.length === 0) {
      throw new Error('No images found to adjust exposure. Please load an image or select images first.')
    }
    
    // Create a selection snapshot from the target images
    const { SelectionSnapshotFactory } = await import('@/lib/ai/execution/SelectionSnapshot')
    const selectionSnapshot = SelectionSnapshotFactory.fromObjects(images)
    
    // Apply the exposure adjustment using the base class helper with selection snapshot
    await this.applyToolOperation(this.tool.id, 'adjustment', params.adjustment, context.canvas, selectionSnapshot)
    
    console.log('[ExposureToolAdapter] Exposure adjustment applied successfully')
    console.log('[ExposureToolAdapter] Final result: adjustment =', params.adjustment, '%')
    
    return {
      success: true,
      adjustment: params.adjustment,
      affectedImages: images.length,
      message: `Adjusted exposure by ${params.adjustment > 0 ? '+' : ''}${params.adjustment}%`,
      targetingMode: context.targetingMode
    }
  }
  
  canExecute(canvas: Canvas): boolean {
    // Can only adjust exposure if there are images on the canvas
    const hasImages = canvas.getObjects().some(obj => obj.type === 'image')
    if (!hasImages) {
      console.warn('Exposure tool: No images on canvas')
    }
    return hasImages
  }
}

// Export singleton instance
const exposureAdapter = new ExposureToolAdapter()
export default exposureAdapter 