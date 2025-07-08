import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { saturationTool } from '@/lib/editor/tools/adjustments/saturationTool'
import type { Canvas } from 'fabric'
import type { Image as FabricImage } from 'fabric'
import { filters } from 'fabric'

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
}

// Define filter type
interface ImageFilter {
  type?: string
  [key: string]: unknown
}

/**
 * Adapter for the saturation tool to make it AI-compatible
 * Following AI SDK v5 patterns
 */
export class SaturationToolAdapter extends BaseToolAdapter<SaturationInput, SaturationOutput> {
  tool = saturationTool
  aiName = 'adjustSaturation'
  description = `Adjust image color saturation. You MUST calculate the adjustment value based on user intent.
Common patterns you should use:
- "more saturated" or "more vibrant" → +20 to +30
- "much more saturated" or "very vibrant" → +40 to +60
- "slightly more saturated" → +10 to +15
- "less saturated" or "muted colors" → -20 to -30
- "much less saturated" or "very muted" → -40 to -60
- "desaturate" or "grayscale" → -100
- "black and white" → -100
- "saturation by X%" → use X directly
- "reduce saturation by X%" → use -X
NEVER ask for exact values - always interpret the user's intent and choose an appropriate value.`
  
  inputSchema = saturationParameters
  
  async execute(params: SaturationInput, context: { canvas: Canvas }): Promise<SaturationOutput> {
    console.log('[SaturationToolAdapter] Execute called with params:', params)
    const canvas = context.canvas
    
    if (!canvas) {
      throw new Error('Canvas is required but not provided in context')
    }
    
    // Get all image objects
    const objects = canvas.getObjects()
    const images = objects.filter(obj => obj.type === 'image') as FabricImage[]
    
    console.log('[SaturationToolAdapter] Found images:', images.length)
    
    if (images.length === 0) {
      throw new Error('No images found on canvas. Please load an image first before adjusting saturation.')
    }
    
    // Store previous saturation values (simplified - just track if filters existed)
    const previousValue = 0 // In a real implementation, we'd track the current saturation
    
    // Apply saturation to all images
    images.forEach(img => {
      // Remove existing saturation filters
      if (!img.filters) {
        img.filters = []
      } else {
        img.filters = img.filters.filter((f) => (f as unknown as ImageFilter).type !== 'Saturation')
      }
      
      // Add new saturation filter if adjustment is not 0
      if (params.adjustment !== 0) {
        const saturationValue = params.adjustment / 100
        const saturationFilter = new filters.Saturation({
          saturation: saturationValue
        })
        
        img.filters.push(saturationFilter)
      }
      
      // Apply filters
      img.applyFilters()
    })
    
    // Render the canvas to show changes
    canvas.renderAll()
    
    console.log('[SaturationToolAdapter] Saturation adjustment applied successfully')
    
    return {
      success: true,
      previousValue,
      newValue: params.adjustment,
      affectedImages: images.length
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