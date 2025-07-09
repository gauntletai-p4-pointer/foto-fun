import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { exposureTool } from '@/lib/editor/tools/adjustments/exposureTool'
import type { Canvas } from 'fabric'
import type { Image as FabricImage } from 'fabric'
import { filters } from 'fabric'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

// Extended type for FabricImage with filters
type FabricImageWithFilters = FabricImage & {
  filters?: unknown[]
  applyFilters(): void
}

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
  description = `Adjust the exposure of existing images to make them appear properly exposed.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be adjusted
- If no images are selected, all images on the canvas will be adjusted

You MUST calculate the adjustment value based on user intent:
- "increase exposure" or "brighter exposure" → +20 to +30
- "decrease exposure" or "darker exposure" → -20 to -30
- "fix overexposure" → -30 to -50
- "fix underexposure" → +30 to +50
- "neutral exposure" → 0

NEVER ask for exact values - interpret the user's intent.
Range: -100 (very dark) to +100 (very bright)`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = exposureParameters
  
  async execute(params: ExposureInput, context: CanvasContext): Promise<ExposureOutput> {
    console.log('[ExposureToolAdapter] Execute called with params:', params)
    console.log('[ExposureToolAdapter] Targeting mode:', context.targetingMode)
    
    const canvas = context.canvas
    
    if (!canvas) {
      throw new Error('Canvas is required but not provided in context')
    }
    
    // Use pre-filtered target images from enhanced context
    const images = context.targetImages
    
    console.log('[ExposureToolAdapter] Target images:', images.length)
    console.log('[ExposureToolAdapter] Targeting mode:', context.targetingMode)
    
    if (images.length === 0) {
      throw new Error('No images found to adjust exposure. Please load an image or select images first.')
    }
    
    // Apply exposure to target images only
    images.forEach((img, index) => {
      console.log(`[ExposureToolAdapter] Processing image ${index + 1}/${images.length}`)
      
      const imageWithFilters = img as FabricImageWithFilters
      
      console.log(`  - Before filters:`, imageWithFilters.filters?.length || 0, 'filters')
      
      // Remove existing exposure filters
      if (!imageWithFilters.filters) {
        imageWithFilters.filters = []
      } else {
        const beforeCount = imageWithFilters.filters.length
        imageWithFilters.filters = imageWithFilters.filters.filter((f: unknown) => {
          const filter = f as unknown as ImageFilter
          const isExposureFilter = f instanceof filters.Brightness && filter.isExposure
          console.log(`    - Checking filter, isExposure: ${isExposureFilter}`)
          return !isExposureFilter
        })
        const afterCount = imageWithFilters.filters.length
        console.log(`    - Removed ${beforeCount - afterCount} existing exposure filters`)
      }
      
      // Add new exposure filter if adjustment is not 0
      if (params.adjustment !== 0) {
        // Exposure typically has a more dramatic effect than brightness
        // Convert -100 to +100 range to a more exponential curve
        const exposureValue = params.adjustment > 0 
          ? params.adjustment * 0.015  // Positive exposure brightens more dramatically
          : params.adjustment * 0.01   // Negative exposure darkens less dramatically
        
        console.log(`    - Converting ${params.adjustment}% to ${exposureValue} brightness value`)
        
        const exposureFilter = new filters.Brightness({
          brightness: exposureValue
        })
        
        // Mark as exposure filter for identification
        ;(exposureFilter as unknown as ImageFilter).isExposure = true
        
        console.log(`    - Created exposure filter:`, exposureFilter)
        console.log(`    - Filter marked as exposure: ${(exposureFilter as unknown as ImageFilter).isExposure}`)
        
        imageWithFilters.filters.push(exposureFilter)
        console.log(`    - Added filter, total filters now: ${imageWithFilters.filters.length}`)
      }
      
      // Apply filters
      console.log(`    - Applying filters to image ${index + 1}`)
      imageWithFilters.applyFilters()
      console.log(`    - Filters applied successfully`)
      
      // Log all filters for debugging
      imageWithFilters.filters.forEach((filter, i) => {
        const filterType = filter.constructor.name
        const isExposure = (filter as unknown as ImageFilter).isExposure
        console.log(`      Filter ${i}: ${filterType} (isExposure: ${isExposure})`)
      })
    })
    
    // Render the canvas to show changes
    canvas.renderAll()
    
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