import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { contrastTool } from '@/lib/editor/tools/adjustments/contrastTool'
import type { Canvas } from 'fabric'
import type { Image as FabricImage } from 'fabric'
import { filters } from 'fabric'

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
}

// Define filter type
interface ImageFilter {
  type?: string
  [key: string]: unknown
}

/**
 * Adapter for the contrast tool to make it AI-compatible
 * Following AI SDK v5 patterns
 */
export class ContrastToolAdapter extends BaseToolAdapter<ContrastInput, ContrastOutput> {
  tool = contrastTool
  aiName = 'adjustContrast'
  description = `Adjust image contrast. You MUST calculate the adjustment value based on user intent.
Common patterns you should use:
- "more contrast" or "increase contrast" → +20 to +30
- "much more contrast" or "high contrast" → +40 to +60
- "slightly more contrast" → +10 to +15
- "less contrast" or "decrease contrast" → -20 to -30
- "much less contrast" or "low contrast" → -40 to -60
- "slightly less contrast" → -10 to -15
- "contrast by X%" → use X directly
- "reduce contrast by X%" → use -X
NEVER ask for exact values - always interpret the user's intent and choose an appropriate value.`
  
  inputSchema = contrastParameters
  
  async execute(params: ContrastInput, context: { canvas: Canvas }): Promise<ContrastOutput> {
    console.log('[ContrastToolAdapter] Execute called with params:', params)
    const canvas = context.canvas
    
    if (!canvas) {
      throw new Error('Canvas is required but not provided in context')
    }
    
    // Get all image objects
    const objects = canvas.getObjects()
    const images = objects.filter(obj => obj.type === 'image') as FabricImage[]
    
    console.log('[ContrastToolAdapter] Found images:', images.length)
    
    if (images.length === 0) {
      throw new Error('No images found on canvas. Please load an image first before adjusting contrast.')
    }
    
    // Store previous contrast values (simplified - just track if filters existed)
    const previousValue = 0 // In a real implementation, we'd track the current contrast
    
    // Apply contrast to all images
    images.forEach(img => {
      // Remove existing contrast filters
      if (!img.filters) {
        img.filters = []
      } else {
        img.filters = img.filters.filter((f) => (f as unknown as ImageFilter).type !== 'Contrast')
      }
      
      // Add new contrast filter if adjustment is not 0
      if (params.adjustment !== 0) {
        const contrastValue = params.adjustment / 100
        const contrastFilter = new filters.Contrast({
          contrast: contrastValue
        })
        
        img.filters.push(contrastFilter)
      }
      
      // Apply filters
      img.applyFilters()
    })
    
    // Render the canvas to show changes
    canvas.renderAll()
    
    console.log('[ContrastToolAdapter] Contrast adjustment applied successfully')
    
    return {
      success: true,
      previousValue,
      newValue: params.adjustment,
      affectedImages: images.length
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