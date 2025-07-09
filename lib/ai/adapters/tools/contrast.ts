import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { contrastTool } from '@/lib/editor/tools/adjustments/contrastTool'
import type { Canvas } from 'fabric'
import type { Image as FabricImage } from 'fabric'
import { filters } from 'fabric'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Extended type for FabricImage with filters
type FabricImageWithFilters = FabricImage & {
  filters?: unknown[]
  applyFilters(): void
}

// Input schema following AI SDK v5 patterns
const contrastParameters = z.object({
  adjustment: z.number()
    .min(-100)
    .max(100)
    .describe('Contrast adjustment from -100 (minimum contrast) to 100 (maximum contrast), where 0 is no change')
})

type ContrastInput = z.infer<typeof contrastParameters>

// Output type
interface ContrastOutput {
  success: boolean
  previousValue: number
  newValue: number
  affectedImages: number
  targetingMode: 'selection' | 'all-images'
}

// Define filter type
interface ImageFilter {
  type?: string
  [key: string]: unknown
}

/**
 * Adapter for the contrast tool to make it AI-compatible
 * Following AI SDK v5 patterns with intelligent image targeting
 */
export class ContrastToolAdapter extends BaseToolAdapter<ContrastInput, ContrastOutput> {
  tool = contrastTool
  aiName = 'adjustContrast'
  description = `Adjust the contrast of existing images on the canvas. This tool increases or decreases the difference between light and dark areas.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be adjusted
- If no images are selected, all images on the canvas will be adjusted

You MUST calculate the adjustment value based on user intent:
- "more contrast" or "higher contrast" → +20 to +30
- "much more contrast" or "very high contrast" → +40 to +60
- "slightly more contrast" → +10 to +15
- "less contrast" or "lower contrast" → -20 to -30
- "much less contrast" or "very low contrast" → -40 to -60
- "flat" or "washed out" → -60 to -80

NEVER ask for exact values - interpret the user's intent and calculate appropriate adjustment values.
Range: -100 (completely flat) to +100 (maximum contrast)`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = contrastParameters
  
  async execute(params: ContrastInput, context: CanvasContext): Promise<ContrastOutput> {
    console.log('[ContrastToolAdapter] Execute called with params:', params)
    console.log('[ContrastToolAdapter] Targeting mode:', context.targetingMode)
    
    const canvas = context.canvas
    
    if (!canvas) {
      throw new Error('Canvas is required but not provided in context')
    }
    
    // Use pre-filtered target images from enhanced context
    const images = context.targetImages
    
    console.log('[ContrastToolAdapter] Target images:', images.length)
    console.log('[ContrastToolAdapter] Targeting mode:', context.targetingMode)
    
    if (images.length === 0) {
      throw new Error('No images found to adjust contrast. Please load an image or select images first.')
    }
    
    // Store previous contrast values (simplified - just track if filters existed)
    const previousValue = 0 // In a real implementation, we'd track the current contrast
    
    // Apply contrast to target images only
    images.forEach((img, index) => {
      console.log(`[ContrastToolAdapter] Processing image ${index + 1}/${images.length}`)
      
      const imageWithFilters = img as FabricImageWithFilters
      
      // Remove existing contrast filters
      if (!imageWithFilters.filters) {
        imageWithFilters.filters = []
      } else {
        imageWithFilters.filters = imageWithFilters.filters.filter((f: unknown) => (f as unknown as ImageFilter).type !== 'Contrast')
      }
      
      // Add new contrast filter if adjustment is not 0
      if (params.adjustment !== 0) {
        const contrastValue = params.adjustment / 100
        const contrastFilter = new filters.Contrast({
          contrast: contrastValue
        })
        
        imageWithFilters.filters.push(contrastFilter)
      }
      
      // Apply filters
      imageWithFilters.applyFilters()
    })
    
    // Render the canvas to show changes
    canvas.renderAll()
    
    console.log('[ContrastToolAdapter] Contrast adjustment applied successfully')
    
    return {
      success: true,
      previousValue,
      newValue: params.adjustment,
      affectedImages: images.length,
      targetingMode: context.targetingMode
    }
  }
  
  canExecute(canvas: Canvas): boolean {
    // Can only adjust contrast if there are images on the canvas
    const hasImages = canvas.getObjects().some(obj => obj.type === 'image')
    if (!hasImages) {
      console.warn('Contrast tool: No images on canvas')
    }
    return hasImages
  }
}

// Export default instance for auto-discovery
export default ContrastToolAdapter 