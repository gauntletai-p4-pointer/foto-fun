import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { saturationTool } from '@/lib/editor/tools/adjustments/saturationTool'
import type { Canvas } from 'fabric'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Input schema following AI SDK v5 patterns
const saturationParameters = z.object({
  adjustment: z.number()
    .min(-100)
    .max(100)
    .describe('Saturation adjustment from -100 (grayscale) to 100 (maximum saturation), where 0 is no change')
})

type SaturationInput = z.infer<typeof saturationParameters>

// Output type
interface SaturationOutput {
  success: boolean
  previousValue: number
  newValue: number
  affectedImages: number
  targetingMode: 'selection' | 'auto-single'
  message?: string
}

/**
 * Adapter for the saturation tool to make it AI-compatible
 * Following AI SDK v5 patterns with intelligent image targeting
 */
export class SaturationToolAdapter extends BaseToolAdapter<SaturationInput, SaturationOutput> {
  tool = saturationTool
  aiName = 'adjustSaturation'
  description = `Adjust color saturation of EXISTING images on the canvas. This tool modifies the vibrancy and color intensity of images that are already loaded.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be adjusted
- If no images are selected, all images on the canvas will be adjusted

Use this tool when the user wants to:
- Make existing images "more vibrant" or "more saturated"
- Make images "less saturated" or "muted"
- Adjust color intensity of existing photos
- Create grayscale or black and white effects

This tool does NOT create new images - it only modifies existing ones on the canvas.

You MUST calculate the adjustment value based on user intent:
- "more saturated" or "more vibrant" → +20 to +30
- "much more saturated" or "very vibrant" → +40 to +60
- "slightly more saturated" → +10 to +15
- "less saturated" or "muted colors" → -20 to -30
- "much less saturated" or "very muted" → -40 to -60
- "desaturate" or "grayscale" → -100
- "black and white" → -100
- "increase saturation by X%" → use +X directly (e.g., "by 25%" → +25)
- "increase the saturation by X%" → use +X directly (e.g., "by 25%" → +25)
- "decrease saturation by X%" → use -X directly (e.g., "by 20%" → -20)
- "reduce saturation by X%" → use -X directly (e.g., "by 30%" → -30)
- "saturation by X%" → use X directly
- "boost saturation X%" → use +X directly
- "lower saturation X%" → use -X directly
- "make colors more vibrant" → +25 to +35
- "to make colors more vibrant" → +25 to +35
- "more colorful" → +20 to +30
- "less colorful" → -20 to -30

NEVER ask for exact values - always interpret the user's intent and choose an appropriate value.`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = saturationParameters
  
  async execute(params: SaturationInput, context: CanvasContext): Promise<SaturationOutput> {
    console.log('[SaturationToolAdapter] ===== EXECUTE CALLED =====')
    console.log('[SaturationToolAdapter] Execute called with params:', params)
    console.log('[SaturationToolAdapter] Adjustment value:', params.adjustment)
    console.log('[SaturationToolAdapter] Targeting mode:', context.targetingMode)
    
    // Use pre-filtered target images from enhanced context
    const images = context.targetImages
    
    console.log('[SaturationToolAdapter] Target images:', images.length)
    console.log('[SaturationToolAdapter] Targeting mode:', context.targetingMode)
    
    if (images.length === 0) {
      throw new Error('No images found to adjust saturation. Please load an image or select images first.')
    }
    
    // Create a selection snapshot from the target images
    const { SelectionSnapshotFactory } = await import('@/lib/ai/execution/SelectionSnapshot')
    const selectionSnapshot = SelectionSnapshotFactory.fromObjects(images)
    
    // Apply the saturation adjustment using the base class helper with selection snapshot
    await this.applyToolOperation(this.tool.id, 'adjustment', params.adjustment, context.canvas, selectionSnapshot)
    
    console.log('[SaturationToolAdapter] Saturation adjustment applied successfully')
    
    // Generate descriptive message
    let description = ''
    const magnitude = Math.abs(params.adjustment)
    
    if (params.adjustment === 0) {
      description = 'No change to saturation'
    } else if (params.adjustment === -100) {
      description = 'Converted to grayscale (removed all color)'
    } else if (params.adjustment > 0) {
      // Increased saturation
      if (magnitude <= 20) {
        description = 'Slightly enhanced color vibrancy'
      } else if (magnitude <= 40) {
        description = 'Moderately increased color intensity'
      } else if (magnitude <= 70) {
        description = 'Significantly boosted color saturation'
      } else {
        description = 'Dramatically intensified colors'
      }
    } else {
      // Decreased saturation
      if (magnitude <= 20) {
        description = 'Slightly muted colors'
      } else if (magnitude <= 40) {
        description = 'Moderately desaturated colors'
      } else if (magnitude <= 70) {
        description = 'Significantly reduced color intensity'
      } else {
        description = 'Nearly removed all color'
      }
    }
    
    const message = `${description} (${params.adjustment > 0 ? '+' : ''}${params.adjustment}%) on ${images.length} image${images.length !== 1 ? 's' : ''}`
    
    return {
      success: true,
      previousValue: 0, // In a real implementation, we'd track the current saturation
      newValue: params.adjustment,
      affectedImages: images.length,
      targetingMode: context.targetingMode,
      message
    }
  }
  
  canExecute(canvas: Canvas): boolean {
    // Can only adjust saturation if there are images on the canvas
    const hasImages = canvas.getObjects().some(obj => obj.type === 'image')
    if (!hasImages) {
      console.warn('Saturation tool: No images on canvas')
    }
    return hasImages
  }
}

// Export default instance for auto-discovery
export default SaturationToolAdapter 