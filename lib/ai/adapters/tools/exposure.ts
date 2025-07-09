import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { exposureTool } from '@/lib/editor/tools/adjustments/exposureTool'
import type { Canvas } from 'fabric'
import type { Image as FabricImage } from 'fabric'
import { filters } from 'fabric'

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
}

// Define filter type
interface ImageFilter {
  type?: string
  isExposure?: boolean
  [key: string]: unknown
}

// Create adapter class
export class ExposureToolAdapter extends BaseToolAdapter<ExposureInput, ExposureOutput> {
  tool = exposureTool
  aiName = 'adjustExposure'
  description = `Adjust image exposure (simulates camera exposure compensation). You MUST calculate the adjustment value based on user intent.
Common patterns you should use:
- "increase exposure" or "overexpose" → +30 to +50
- "decrease exposure" or "underexpose" → -30 to -50
- "slightly overexposed" → +15 to +25
- "slightly underexposed" → -15 to -25
- "blown out" or "very overexposed" → +60 to +80
- "very dark" or "very underexposed" → -60 to -80
- "adjust exposure by X stops" → X * 33 (each stop ≈ 33 units)
Note: Exposure has a more dramatic effect than brightness, affecting the entire tonal range.
NEVER ask for exact values - always interpret the user's intent and choose an appropriate value.`
  
  inputSchema = exposureParameters
  
  async execute(params: ExposureInput, context: { canvas: Canvas }): Promise<ExposureOutput> {
    console.log('[ExposureToolAdapter] Execute called with params:', params)
    const canvas = context.canvas
    
    if (!canvas) {
      throw new Error('Canvas is required but not provided in context')
    }
    
    // Get all image objects
    const objects = canvas.getObjects()
    const images = objects.filter(obj => obj.type === 'image') as FabricImage[]
    
    console.log('[ExposureToolAdapter] Found images:', images.length)
    
    if (images.length === 0) {
      throw new Error('No images found on canvas. Please load an image first before adjusting exposure.')
    }
    
    // Apply exposure to all images
    images.forEach(img => {
      // Remove existing exposure filters
      if (!img.filters) {
        img.filters = []
      } else {
        img.filters = img.filters.filter((f) => {
          const filter = f as unknown as ImageFilter
          return !(f instanceof filters.Brightness && filter.isExposure)
        })
      }
      
      // Add new exposure filter if adjustment is not 0
      if (params.adjustment !== 0) {
        // Exposure typically has a more dramatic effect than brightness
        // Convert -100 to +100 range to a more exponential curve
        const exposureValue = params.adjustment > 0 
          ? params.adjustment * 0.015  // Positive exposure brightens more dramatically
          : params.adjustment * 0.01   // Negative exposure darkens less dramatically
        
        const exposureFilter = new filters.Brightness({
          brightness: exposureValue
        })
        
        // Mark as exposure filter for identification
        ;(exposureFilter as unknown as ImageFilter).isExposure = true
        
        img.filters.push(exposureFilter)
      }
      
      // Apply filters
      img.applyFilters()
    })
    
    // Render the canvas to show changes
    canvas.renderAll()
    
    console.log('[ExposureToolAdapter] Exposure adjustment applied successfully')
    
    return {
      success: true,
      adjustment: params.adjustment,
      affectedImages: images.length,
      message: `Adjusted exposure by ${params.adjustment > 0 ? '+' : ''}${params.adjustment}%`
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