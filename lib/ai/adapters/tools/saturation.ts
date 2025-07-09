import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { saturationTool } from '@/lib/editor/tools/adjustments/saturationTool'
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
  targetingMode: 'selection' | 'all-images'
}

// Define filter type
interface ImageFilter {
  type?: string
  [key: string]: unknown
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
- "less saturated" or "muted colors" → -20 to -40
- "desaturated" or "grayscale" → -80 to -100

NEVER ask for exact values - interpret the user's intent and calculate appropriate adjustment values.`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = saturationParameters
  
  async execute(params: SaturationInput, context: CanvasContext): Promise<SaturationOutput> {
    console.log('[SaturationToolAdapter] Execute called with params:', params)
    console.log('[SaturationToolAdapter] Targeting mode:', context.targetingMode)
    
    const canvas = context.canvas
    
    if (!canvas) {
      throw new Error('Canvas is required but not provided in context')
    }
    
    // Use pre-filtered target images from enhanced context
    const images = context.targetImages
    
    console.log('[SaturationToolAdapter] Target images:', images.length)
    console.log('[SaturationToolAdapter] Targeting mode:', context.targetingMode)
    
    if (images.length === 0) {
      throw new Error('No images found to adjust saturation. Please load an image or select images first.')
    }
    
    // Store previous saturation values (simplified - just track if filters existed)
    const previousValue = 0 // In a real implementation, we'd track the current saturation
    
    // Apply saturation to target images only
    images.forEach((img, index) => {
      console.log(`[SaturationToolAdapter] Processing image ${index + 1}/${images.length}`)
      
      const imageWithFilters = img as FabricImageWithFilters
      
      // Remove existing saturation filters
      if (!imageWithFilters.filters) {
        imageWithFilters.filters = []
      } else {
        imageWithFilters.filters = imageWithFilters.filters.filter((f: unknown) => (f as unknown as ImageFilter).type !== 'Saturation')
      }
      
      // Add new saturation filter if adjustment is not 0
      if (params.adjustment !== 0) {
        const saturationValue = params.adjustment / 100
        const saturationFilter = new filters.Saturation({
          saturation: saturationValue
        })
        
        imageWithFilters.filters.push(saturationFilter)
      }
      
      // Apply filters
      imageWithFilters.applyFilters()
    })
    
    // Render the canvas to show changes
    canvas.renderAll()
    
    console.log('[SaturationToolAdapter] Saturation adjustment applied successfully')
    
    return {
      success: true,
      previousValue,
      newValue: params.adjustment,
      affectedImages: images.length,
      targetingMode: context.targetingMode
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