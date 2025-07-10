import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { hueTool } from '@/lib/editor/tools/adjustments/hueTool'
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
const hueParameters = z.object({
  rotation: z.number()
    .min(-180)
    .max(180)
    .describe('Hue rotation in degrees from -180 to 180, where 0 is no change')
})

type HueInput = z.infer<typeof hueParameters>

// Output type
interface HueOutput {
  success: boolean
  previousValue: number
  newValue: number
  affectedImages: number
  targetingMode: 'selection' | 'all-images'
}

// Define filter type that extends the base filter
type ExtendedFilter = {
  type?: string
  _isHueRotation?: boolean
  _isHueTest?: boolean
  [key: string]: unknown
}

/**
 * Adapter for the hue tool to make it AI-compatible
 * Following AI SDK v5 patterns with intelligent image targeting
 */
export class HueToolAdapter extends BaseToolAdapter<HueInput, HueOutput> {
  tool = hueTool
  aiName = 'adjustHue'
  description = `Adjust image hue (color rotation on the color wheel). You MUST calculate the rotation value based on user intent.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be adjusted
- If no images are selected, all images on the canvas will be adjusted

IMPORTANT: When user specifies exact degrees, ALWAYS use that value directly:
- "shift hue by 70 degrees" → use 70
- "rotate hue by -45 degrees" → use -45
- "warmer tones by 60 degrees" → use 60 (ignore the "warmer" part, use the explicit degrees)

If NO explicit degrees are given, use these patterns:
- "shift colors" or "rotate hue" → +45 to +90
- "complementary colors" → +180 or -180
- Color shifts (rotates ALL colors by same amount):
  - "make it more red/orange" → +15 to +30
  - "make it more yellow" → +60 to +80
  - "make it more green" → +120 to +140
  - "make it more cyan" → +180 to +200 (or -180 to -160)
  - "make it more blue" → -120 to -90
  - "make it more purple/magenta" → -60 to -30
- "warmer tones" (no degrees specified) → +20 to +40 (toward red/orange)
- "cooler tones" (no degrees specified) → -20 to -40 (toward blue/cyan)

NOTE: This rotates ALL colors on the color wheel by the same amount.
NEVER ask for exact values - always interpret the user's intent and choose an appropriate value.`
  
  inputSchema = hueParameters
  
  // Add metadata property required by BaseToolAdapter
  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }
  
  async execute(params: HueInput, context: CanvasContext): Promise<HueOutput> {
    console.log('[HueToolAdapter] Execute called with params:', params)
    console.log('[HueToolAdapter] Targeting mode:', context.targetingMode)
    
    const canvas = context.canvas
    
    if (!canvas) {
      throw new Error('Canvas is required but not provided in context')
    }
    
    // Use pre-filtered target images from enhanced context
    const images = context.targetImages
    
    console.log('[HueToolAdapter] Target images:', images.length)
    console.log('[HueToolAdapter] Targeting mode:', context.targetingMode)
    
    if (images.length === 0) {
      throw new Error('No images found to adjust hue. Please load an image or select images first.')
    }
    
    // Apply hue to target images only
    images.forEach((img, index) => {
      console.log(`[HueToolAdapter] Processing image ${index + 1}/${images.length}`)
      
      const imageWithFilters = img as FabricImageWithFilters
      
      console.log(`  - Before filters:`, imageWithFilters.filters?.length || 0, 'filters')
      
      // Remove existing hue rotation filters
      if (!imageWithFilters.filters) {
        imageWithFilters.filters = []
      } else {
        const beforeCount = img.filters.length
        img.filters = img.filters.filter((f) => {
          const filter = f as unknown as ExtendedFilter
          const filterType = filter?.type || f.constructor.name
          console.log(`    - Checking filter type: ${filterType}`)
          // Remove ColorMatrix filters that were used for hue rotation
          // We identify them by checking if they have the hue rotation marker
          if (filterType === 'ColorMatrix' && filter._isHueRotation) {
            return false
          }
          // Remove test brightness filters from debugging
          if (filterType === 'Brightness' && filter._isHueTest) {
            return false
          }
          return filterType !== 'HueRotation'
        })
        const afterCount = imageWithFilters.filters.length
        console.log(`    - Removed ${beforeCount - afterCount} existing hue filters`)
      }
      
      // Add new hue rotation filter if rotation is not 0
      if (params.rotation !== 0) {
        // Convert degrees to radians for calculation
        const rotationRadians = (params.rotation * Math.PI) / 180
        console.log(`    - Converting ${params.rotation}° to ${rotationRadians} radians`)
        
        // Try both approaches - first HueRotation (simpler)
        try {
          const hueFilter = new filters.HueRotation({
            rotation: rotationRadians
          })
          
          console.log(`    - Created HueRotation filter:`, hueFilter)
          console.log(`    - Filter type:`, (hueFilter as unknown as ExtendedFilter)?.type || hueFilter.constructor.name)
          
          imageWithFilters.filters.push(hueFilter)
          console.log(`    - Added HueRotation filter, total filters now: ${imageWithFilters.filters.length}`)
        } catch (error) {
          console.log(`    - HueRotation failed, trying ColorMatrix approach:`, error)
          
          // Fallback to ColorMatrix approach
          const cos = Math.cos(rotationRadians)
          const sin = Math.sin(rotationRadians)
          
          // Standard hue rotation matrix
          const matrix = [
            0.213 + cos * 0.787 - sin * 0.213,
            0.715 - cos * 0.715 - sin * 0.715,
            0.072 - cos * 0.072 + sin * 0.928,
            0,
            0,
            0.213 - cos * 0.213 + sin * 0.143,
            0.715 + cos * 0.285 + sin * 0.140,
            0.072 - cos * 0.072 - sin * 0.283,
            0,
            0,
            0.213 - cos * 0.213 - sin * 0.787,
            0.715 - cos * 0.715 + sin * 0.715,
            0.072 + cos * 0.928 + sin * 0.072,
            0,
            0,
            0,
            0,
            0,
            1,
            0
          ]
          
          const colorMatrixFilter = new filters.ColorMatrix({
            matrix: matrix
          })
          
          // Mark this filter as a hue rotation filter for identification
          ;(colorMatrixFilter as unknown as ExtendedFilter)._isHueRotation = true
          
          console.log(`    - Created ColorMatrix filter for hue rotation`)
          console.log(`    - Filter type:`, (colorMatrixFilter as unknown as ExtendedFilter)?.type || colorMatrixFilter.constructor.name)
          
          imageWithFilters.filters.push(colorMatrixFilter)
          console.log(`    - Added ColorMatrix filter, total filters now: ${imageWithFilters.filters.length}`)
        }
      }
      
      // Apply filters
      console.log(`    - Applying filters to image ${index + 1}`)
      
      // DEBUGGING: Add a test brightness filter to verify filters work
      if (params.rotation !== 0) {
        const testBrightness = new filters.Brightness({
          brightness: 0.1 // Slight brightness increase to test if filters work
        })
        ;(testBrightness as unknown as ExtendedFilter)._isHueTest = true
        img.filters.push(testBrightness)
        console.log(`    - Added test brightness filter for debugging`)
      }
      
      imageWithFilters.applyFilters()
      console.log(`    - Filters applied successfully`)
      console.log(`    - Final filter count: ${imageWithFilters.filters.length}`)
      
      // Log all filters for debugging
      img.filters.forEach((filter, i) => {
        const filterType = (filter as unknown as ExtendedFilter)?.type || filter.constructor.name
        console.log(`      Filter ${i}: ${filterType}`)
      })
    })
    
    // Render the canvas to show changes
    canvas.renderAll()
    
    console.log('[HueToolAdapter] Hue adjustment applied successfully')
    
    return {
      success: true,
      previousValue: 0, // In a real implementation, we'd track the current hue
      newValue: params.rotation,
      affectedImages: images.length,
      targetingMode: context.targetingMode
    }
  }
  
  canExecute(canvas: Canvas): boolean {
    // Can only adjust hue if there are images on the canvas
    const hasImages = canvas.getObjects().some(obj => obj.type === 'image')
    if (!hasImages) {
      console.warn('Hue tool: No images on canvas')
    }
    return hasImages
  }
}

// Export default instance for auto-discovery
const hueAdapter = new HueToolAdapter()
export default hueAdapter 